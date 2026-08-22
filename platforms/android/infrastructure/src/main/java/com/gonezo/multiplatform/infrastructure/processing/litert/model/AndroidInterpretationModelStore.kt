package com.gonezo.multiplatform.infrastructure.processing.litert.model

import android.content.Context
import com.gonezo.multiplatform.infrastructure.processing.litert.runtime.ElapsedRealtimeProvider
import com.gonezo.multiplatform.infrastructure.processing.litert.runtime.InterpretationRuntimeLogger
import com.gonezo.multiplatform.infrastructure.processing.litert.runtime.NoOpElapsedRealtimeProvider
import com.gonezo.multiplatform.infrastructure.processing.litert.runtime.NoOpInterpretationRuntimeLogger
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationException
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationFailurePhase
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption

internal class AndroidInterpretationModelStore(
  private val baseDirectory: File,
  private val assetReader: (String) -> InputStream,
  private val configuration: InterpretationModelConfiguration,
  private val integrityVerifier: InterpretationModelIntegrityVerifier = Sha256InterpretationModelIntegrityVerifier,
  private val logger: InterpretationRuntimeLogger = NoOpInterpretationRuntimeLogger,
  private val elapsedRealtimeProvider: ElapsedRealtimeProvider = NoOpElapsedRealtimeProvider,
) : InterpretationModelStore {
  constructor(context: Context, configuration: InterpretationModelConfiguration) : this(
    baseDirectory = context.noBackupFilesDir,
    assetReader = { assetPath -> context.assets.open(assetPath) },
    configuration = configuration,
  )

  private val targetFile = File(baseDirectory, configuration.fileName)
  private val validationStore = InterpretationModelValidationStore(
    File(baseDirectory, "${configuration.fileName}.validation.properties"),
  )

  @Synchronized
  override fun resolveModelPath(): String {
    if (targetFile.isFile) {
      val marker = validationStore.read()
      if (marker != null && marker.matches(configuration, targetFile)) {
        log("interpretation.model.validation.cache_hit", cacheHit = true)
        return targetFile.absolutePath
      }
      log("interpretation.model.validation.cache_miss", cacheHit = false)
      if (validate(targetFile)) {
        writeValidationRecord()
        return targetFile.absolutePath
      }
    }
    replaceInstalledModel()
    return targetFile.absolutePath
  }

  private fun replaceInstalledModel() {
    if (targetFile.exists() && !targetFile.delete()) {
      throw unavailable("Interpretation model could not replace an invalid local copy.")
    }
    validationStore.delete()
    targetFile.parentFile?.mkdirs()
    val temporaryFile = File.createTempFile("${configuration.fileName}.", ".tmp", targetFile.parentFile ?: baseDirectory)
    try {
      assetReader(configuration.assetPath).use { input ->
        temporaryFile.outputStream().use { output -> input.copyTo(output) }
      }
      if (!validate(temporaryFile)) {
        throw corrupt("Interpretation model failed integrity validation.")
      }
      moveIntoPlace(temporaryFile, targetFile)
      if (!targetFile.isFile || targetFile.length() != configuration.expectedSizeBytes) {
        throw corrupt("Interpretation model failed installation verification.")
      }
      writeValidationRecord()
    } catch (exception: StructuredGenerationException) {
      temporaryFile.delete()
      targetFile.delete()
      validationStore.delete()
      throw exception
    } catch (exception: IOException) {
      temporaryFile.delete()
      targetFile.delete()
      validationStore.delete()
      throw unavailable("Interpretation model could not be copied.", exception)
    } catch (exception: RuntimeException) {
      temporaryFile.delete()
      targetFile.delete()
      validationStore.delete()
      throw unavailable("Interpretation model could not be copied.", exception)
    }
  }

  private fun validate(file: File): Boolean {
    val startedAt = elapsedRealtimeProvider.now()
    val valid = integrityVerifier.isValid(file, configuration)
    log("interpretation.model.validation.sha256_ms", elapsedRealtimeProvider.now() - startedAt)
    return valid
  }

  private fun writeValidationRecord() {
    validationStore.write(
      InterpretationModelValidationRecord(
        schemaVersion = InterpretationModelValidationRecord.CURRENT_SCHEMA_VERSION,
        modelId = configuration.modelId,
        modelVersion = configuration.modelVersion,
        fileName = configuration.fileName,
        expectedSizeBytes = configuration.expectedSizeBytes,
        expectedSha256 = configuration.sha256,
        observedSizeBytes = targetFile.length(),
        observedLastModified = targetFile.lastModified(),
      ),
    )
  }

  private fun moveIntoPlace(source: File, target: File) {
    try {
      Files.move(source.toPath(), target.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
    } catch (_: IOException) {
      Files.move(source.toPath(), target.toPath(), StandardCopyOption.REPLACE_EXISTING)
    }
  }

  private fun log(event: String, durationMs: Long? = null, cacheHit: Boolean? = null) {
    logger.log("GonezoInterpretation", buildString {
      append(event)
      append(" modelId=").append(configuration.modelId)
      append(" modelVersion=").append(configuration.modelVersion)
      append(" interpretation_model=").append(configuration.fileName)
      durationMs?.let { append(" durationMs=").append(it) }
      cacheHit?.let { append(" model_validation_cache_hit=").append(it) }
    })
  }

  private fun unavailable(message: String, cause: Throwable? = null) = StructuredGenerationException(
    failureCode = InterpretationFailureCode.MODEL_UNAVAILABLE,
    recoverable = true,
    phase = StructuredGenerationFailurePhase.MODEL_RESOLUTION,
    message = message,
    cause = cause,
  )

  private fun corrupt(message: String, cause: Throwable? = null) = StructuredGenerationException(
    failureCode = InterpretationFailureCode.MODEL_CORRUPT,
    recoverable = true,
    phase = StructuredGenerationFailurePhase.MODEL_RESOLUTION,
    message = message,
    cause = cause,
  )
}
