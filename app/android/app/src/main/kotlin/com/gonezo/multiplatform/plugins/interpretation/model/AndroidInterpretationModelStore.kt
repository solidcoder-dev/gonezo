package com.gonezo.multiplatform.plugins.interpretation.model

import android.content.Context
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase
import dev.solidcoder.interpretation.application.StructuredGenerationException
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.MessageDigest

internal class AndroidInterpretationModelStore(
  private val baseDirectory: File,
  private val assetReader: (String) -> InputStream,
  private val configuration: InterpretationModelConfiguration,
) : InterpretationModelStore {
  constructor(
    context: Context,
    configuration: InterpretationModelConfiguration,
  ) : this(
    baseDirectory = context.noBackupFilesDir,
    assetReader = { assetPath -> context.assets.open(assetPath) },
    configuration = configuration,
  )

  private val targetFile = File(baseDirectory, configuration.fileName)

  @Synchronized
  override fun resolveModelPath(): String {
    if (targetFile.isFile && isValid(targetFile)) {
      return targetFile.absolutePath
    }

    if (targetFile.exists() && !targetFile.delete()) {
      throw unavailable("Interpretation model could not replace an invalid local copy.")
    }

    targetFile.parentFile?.mkdirs()
    val temporaryFile = File.createTempFile("${configuration.fileName}.", ".tmp", targetFile.parentFile ?: baseDirectory)

    try {
      assetReader(configuration.assetPath).use { input ->
        temporaryFile.outputStream().use { output -> input.copyTo(output) }
      }

      if (!isValid(temporaryFile)) {
        throw corrupt("Interpretation model failed integrity validation.")
      }

      moveIntoPlace(temporaryFile, targetFile)

      if (!isValid(targetFile)) {
        throw corrupt("Interpretation model failed integrity validation.")
      }

      return targetFile.absolutePath
    } catch (exception: StructuredGenerationException) {
      temporaryFile.delete()
      targetFile.delete()
      throw exception
    } catch (exception: IOException) {
      temporaryFile.delete()
      targetFile.delete()
      throw unavailable("Interpretation model could not be copied.", exception)
    } catch (exception: RuntimeException) {
      temporaryFile.delete()
      targetFile.delete()
      throw unavailable("Interpretation model could not be copied.", exception)
    }
  }

  private fun moveIntoPlace(source: File, target: File) {
    try {
      Files.move(
        source.toPath(),
        target.toPath(),
        StandardCopyOption.REPLACE_EXISTING,
        StandardCopyOption.ATOMIC_MOVE,
      )
    } catch (_: IOException) {
      Files.move(
        source.toPath(),
        target.toPath(),
        StandardCopyOption.REPLACE_EXISTING,
      )
    }
  }

  private fun isValid(file: File): Boolean {
    return file.isFile && file.length() == configuration.expectedSizeBytes && sha256(file) == configuration.sha256
  }

  private fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
      val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
      while (true) {
        val read = input.read(buffer)
        if (read < 0) {
          break
        }
        if (read > 0) {
          digest.update(buffer, 0, read)
        }
      }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
  }

  private fun unavailable(message: String, cause: Throwable? = null): StructuredGenerationException {
    return StructuredGenerationException(
      failureCode = InterpretationFailureCode.MODEL_UNAVAILABLE,
      recoverable = true,
      phase = StructuredGenerationFailurePhase.MODEL_RESOLUTION,
      message = message,
      cause = cause,
    )
  }

  private fun corrupt(message: String, cause: Throwable? = null): StructuredGenerationException {
    return StructuredGenerationException(
      failureCode = InterpretationFailureCode.MODEL_CORRUPT,
      recoverable = true,
      phase = StructuredGenerationFailurePhase.MODEL_RESOLUTION,
      message = message,
      cause = cause,
    )
  }
}
