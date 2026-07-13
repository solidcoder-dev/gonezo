package com.gonezo.multiplatform.plugins.interpretation.artifacts

import androidx.core.util.AtomicFile
import dev.solidcoder.interpretation.application.FieldInterpretationAttempt
import dev.solidcoder.interpretation.application.FieldInterpretationAttemptStatus
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.nio.charset.StandardCharsets
import java.util.UUID

internal class AndroidPrivateInterpretationArtifactStore internal constructor(
  private val baseDirectory: File,
  private val clock: InterpretationArtifactClock,
  private val cleanupPolicy: InterpretationArtifactCleanupPolicy,
  private val deleteDirectoryTree: (File) -> Boolean,
) : InterpretationArtifactStore {
  constructor(baseDirectory: File) : this(
    baseDirectory = baseDirectory,
    clock = InterpretationArtifactClock { System.currentTimeMillis() },
    cleanupPolicy = InterpretationArtifactCleanupPolicy.DEFAULT,
    deleteDirectoryTree = { directory -> directory.deleteRecursively() },
  )

  private val runsDirectory = File(baseDirectory, "interpretation-runs")

  override fun beginRun(
    runId: String,
    createdAtEpochMs: Long
  ): File {
    val runDirectory = canonicalRunDirectory(runId)
    if (runDirectory.exists()) {
      deleteRunDirectory(runDirectory)
    }
    if (!runDirectory.mkdirs() && !runDirectory.isDirectory) {
      throw storageFailure("Interpretation run storage could not be prepared.")
    }

    val audioFile = audioFile(runId)
    createOrTruncate(audioFile)
    writeManifest(
      runId = runId,
      manifest = RunManifest.recording(runId, createdAtEpochMs)
    )
    return audioFile
  }

  override fun resolveAudio(runId: String): File {
    val audioFile = audioFile(runId)
    if (!audioFile.isFile) {
      throw storageFailure("Interpretation run audio was not found.")
    }
    return audioFile.canonicalFile
  }

  override fun completeAudio(
    runId: String,
    metadata: AudioArtifactMetadata
  ) {
    try {
      requireExistingRun(runId)
      val updatedAtEpochMs = clock.nowEpochMs()
      writeManifest(
        runId = runId,
        manifest = loadManifest(runId).copy(
          status = "captured",
          updatedAtEpochMs = updatedAtEpochMs,
          audio = metadata,
        )
      )
    } catch (exception: RuntimeException) {
      throw storageFailure("Interpretation audio metadata could not be stored.", exception)
    }
  }

  override fun storeTranscript(
    runId: String,
    transcriptJson: String
  ) {
    try {
      val runDirectory = requireExistingRun(runId)
      writeJsonAtomically(File(runDirectory, "transcript.v1.json"), transcriptJson)
      val updatedAtEpochMs = clock.nowEpochMs()
      val transcriptRoot = JSONObject(transcriptJson)
      val result = transcriptRoot.optJSONObject("result") ?: JSONObject()
      val transcript = result.opt("transcript")
      val manifest = if (transcript == null || transcript == JSONObject.NULL) {
        val failureCode = result.optJSONArray("issues")
          ?.optJSONObject(0)
          ?.optString("code")
          ?.takeIf { it.isNotBlank() }
          ?: "transcription-invalid-output"
        loadManifest(runId).copy(
          status = "failed",
          updatedAtEpochMs = updatedAtEpochMs,
          failure = FailureMetadata(
            stage = InterpretationRunStage.TRANSCRIPTION.wireValue,
            code = failureCode,
          ),
        )
      } else {
        loadManifest(runId).copy(
          status = "transcribed",
          updatedAtEpochMs = updatedAtEpochMs,
          transcription = TranscriptMetadata(
            completedAtEpochMs = updatedAtEpochMs,
            language = transcriptRoot
              .optJSONObject("request")
              ?.optString("language")
              ?.takeIf { it.isNotBlank() },
          ),
        )
      }
      writeManifest(runId, manifest)
    } catch (exception: RuntimeException) {
      throw storageFailure("Interpretation transcript could not be stored.", exception)
    }
  }

  override fun storeInterpretation(
    runId: String,
    requestJson: String,
    resultJson: String,
    attempts: List<FieldInterpretationAttempt>,
  ) {
    try {
      val runDirectory = requireExistingRun(runId)
      val updatedAtEpochMs = clock.nowEpochMs()
      val request = JSONObject(requestJson)
      val spec = request.getJSONObject("spec")
      val specId = spec.optString("id").takeIf { it.isNotBlank() }
        ?: spec.optString("specId").takeIf { it.isNotBlank() }
        ?: throw IllegalArgumentException("Interpretation request spec id is missing.")
      val specVersion = spec.optString("version").takeIf { it.isNotBlank() }
        ?: spec.optString("specVersion").takeIf { it.isNotBlank() }
        ?: throw IllegalArgumentException("Interpretation request spec version is missing.")
      val resolvedFieldCount = resolvedFieldCount(resultJson)
      val interpretationQuality = if (resolvedFieldCount > 0) "usable" else "no_usable_fields"
      val interpretationJson = JSONObject()
        .put("version", 1)
        .put("runId", validateRunId(runId))
        .put("createdAtEpochMs", updatedAtEpochMs)
        .put("request", request)
        .put("result", JSONObject(resultJson))
        .put("interpretations", org.json.JSONArray(attempts.map(::interpretationAttemptToJson)))
        .toString()
      writeJsonAtomically(File(runDirectory, "interpretation.v1.json"), interpretationJson)

      val manifest = loadManifest(runId).copy(
        status = "interpreted",
        updatedAtEpochMs = updatedAtEpochMs,
        interpretation = InterpretationMetadata(
          completedAtEpochMs = updatedAtEpochMs,
          contractVersion = request.optString("contractVersion").takeIf { it.isNotBlank() } ?: "1",
          specId = specId,
          specVersion = specVersion,
          resolvedFieldCount = resolvedFieldCount,
          quality = interpretationQuality,
        ),
      )
      writeManifest(runId, manifest)
    } catch (exception: RuntimeException) {
      throw storageFailure("Interpretation result could not be stored.", exception)
    }
  }

  override fun storeInterpretationFailure(
    runId: String,
    requestJson: String,
    failure: InterpretationFailureArtifact,
    attempts: List<FieldInterpretationAttempt>,
  ) {
    try {
      val runDirectory = requireExistingRun(runId)
      val updatedAtEpochMs = clock.nowEpochMs()
      val interpretationJson = JSONObject()
        .put("version", 1)
        .put("runId", validateRunId(runId))
        .put("createdAtEpochMs", updatedAtEpochMs)
        .put("status", "failed")
        .put("stage", InterpretationRunStage.INTERPRETATION.wireValue)
        .put("phase", failure.phase)
        .put("request", JSONObject(requestJson))
        .put("interpretations", org.json.JSONArray(attempts.map(::interpretationAttemptToJson)))
        .put(
          "failure",
          JSONObject()
            .put("code", failure.code)
            .put("failureCode", failure.failureCode ?: failure.code)
            .put("recoverable", failure.recoverable)
            .put("exceptionType", failure.exceptionType)
            .put("message", failure.safeMessage)
            .put("fieldKey", failure.fieldKey)
            .put("fieldIndex", failure.fieldIndex)
            .put("fieldCount", failure.fieldCount)
            .put("durationMs", failure.durationMs)
            .put("failedFieldKey", failure.failedFieldKey)
            .put("completedFieldKeys", org.json.JSONArray(failure.completedFieldKeys))
        )
        .put(
          "runtime",
          JSONObject()
            .put("modelId", failure.runtime.modelId)
            .put("modelVersion", failure.runtime.modelVersion)
            .put("backend", failure.runtime.backend)
        )
        .put(
          "generation",
          JSONObject()
            .put("outputLength", failure.outputLength ?: JSONObject.NULL)
        )
        .toString()
      writeJsonAtomically(File(runDirectory, "interpretation.v1.json"), interpretationJson)

      val manifest = loadManifest(runId).copy(
        status = "failed",
        updatedAtEpochMs = updatedAtEpochMs,
        failure = FailureMetadata(
          stage = InterpretationRunStage.INTERPRETATION.wireValue,
          code = failure.code,
          phase = failure.phase,
          recoverable = failure.recoverable,
          exceptionType = failure.exceptionType,
          message = failure.safeMessage,
          modelId = failure.runtime.modelId,
          modelVersion = failure.runtime.modelVersion,
          backend = failure.runtime.backend,
          outputLength = failure.outputLength,
          fieldKey = failure.fieldKey,
          fieldIndex = failure.fieldIndex,
          fieldCount = failure.fieldCount,
          durationMs = failure.durationMs,
          completedFieldKeys = failure.completedFieldKeys,
          failedFieldKey = failure.failedFieldKey,
          failureCode = failure.failureCode ?: failure.code,
        ),
      )
      writeManifest(runId, manifest)
    } catch (exception: RuntimeException) {
      throw storageFailure("Interpretation result could not be stored.", exception)
    }
  }

  override fun markFailed(
    runId: String,
    stage: InterpretationRunStage,
    code: String
  ) {
    try {
      requireExistingRun(runId)
      val updatedAtEpochMs = clock.nowEpochMs()
      val manifest = loadManifest(runId).copy(
        status = "failed",
        updatedAtEpochMs = updatedAtEpochMs,
        failure = FailureMetadata(stage.wireValue, code),
      )
      writeManifest(runId, manifest)
    } catch (exception: RuntimeException) {
      throw storageFailure("Interpretation failure metadata could not be stored.", exception)
    }
  }

  override fun deleteRun(runId: String) {
    val runDirectory = canonicalRunDirectory(runId)
    if (!runDirectory.exists()) {
      return
    }
    deleteRunDirectory(runDirectory)
  }

  override fun cleanupTemporaryArtifacts() {
    val nowEpochMs = clock.nowEpochMs()
    if (!runsDirectory.isDirectory) {
      return
    }

    runsDirectory.walkTopDown()
      .filter { it.isFile && isTemporaryArtifact(it) && isStale(it.lastModified(), nowEpochMs) }
      .forEach { deleteTemporaryArtifact(it) }

    runsDirectory.listFiles()?.filter { it.isDirectory }?.forEach { runDirectory ->
      val manifest = loadManifestForCleanup(runDirectory)
      when {
        manifest == null -> {
          if (isStale(runDirectory.lastModified(), nowEpochMs)) {
            deleteRunDirectory(runDirectory)
          }
        }
        manifest.status == "recording" -> {
          if (isStale(manifest.updatedAtEpochMs, nowEpochMs)) {
            deleteRunDirectory(runDirectory)
          }
        }
      }
    }
  }

  private fun requireExistingRun(runId: String): File {
    val runDirectory = canonicalRunDirectory(runId)
    if (!runDirectory.isDirectory) {
      throw storageFailure("Interpretation run was not found.")
    }
    return runDirectory
  }

  private fun audioFile(runId: String): File = File(requireExistingRun(runId), "audio.wav")

  private fun manifestFile(runId: String): File = File(requireExistingRun(runId), "manifest.v1.json")

  private fun canonicalRunDirectory(runId: String): File {
    val normalizedRunId = validateRunId(runId)
    val runDirectory = File(File(canonicalRunsDirectory(), normalizedRunId).path)
    val canonicalRunDirectory = try {
      runDirectory.canonicalFile
    } catch (exception: IOException) {
      throw storageFailure("Interpretation run path could not be resolved.", exception)
    }
    val canonicalRunsPath = canonicalRunsDirectory().canonicalFile.path + File.separator
    if (!canonicalRunDirectory.path.startsWith(canonicalRunsPath)) {
      throw storageFailure("Interpretation run path is outside the private storage directory.")
    }
    return canonicalRunDirectory
  }

  private fun canonicalRunsDirectory(): File {
    val canonicalBase = try {
      baseDirectory.canonicalFile
    } catch (exception: IOException) {
      throw storageFailure("Interpretation run storage could not be resolved.", exception)
    }
    val runsRoot = File(canonicalBase, "interpretation-runs")
    if (runsRoot.exists() && !runsRoot.isDirectory) {
      throw storageFailure("Interpretation run storage is not available.")
    }
    if (!runsRoot.exists() && !runsRoot.mkdirs()) {
      throw storageFailure("Interpretation run storage could not be prepared.")
    }
    return runsRoot
  }

  private fun validateRunId(runId: String): String = try {
    UUID.fromString(runId).toString()
  } catch (exception: IllegalArgumentException) {
    throw IllegalArgumentException("runId must be a UUID", exception)
  }

  private fun loadManifest(runId: String): RunManifest = RunManifest.fromJson(manifestFile(runId).readText())

  private fun loadManifestForCleanup(runDirectory: File): RunManifest? {
    val manifestFile = File(runDirectory, "manifest.v1.json")
    if (!manifestFile.isFile) {
      return null
    }

    return try {
      RunManifest.fromJson(manifestFile.readText())
    } catch (_: RuntimeException) {
      null
    }
  }

  private fun writeManifest(runId: String, manifest: RunManifest) {
    writeJsonAtomically(manifestFile(runId), manifest.toJson().toString())
  }

  private fun resolvedFieldCount(resultJson: String): Int {
    val result = JSONObject(resultJson)
    val fields = result.optJSONArray("fields") ?: return 0
    var count = 0
    for (index in 0 until fields.length()) {
      val field = fields.optJSONObject(index) ?: continue
      if (field.optJSONObject("interpretation")?.optString("kind") == "resolved") {
        count += 1
      }
    }
    return count
  }

  private fun writeJsonAtomically(targetFile: File, content: String) {
    val parentDirectory = targetFile.parentFile
      ?: throw storageFailure("Interpretation run storage is not available.")

    ensureDirectoryExists(parentDirectory)

    val atomicFile = AtomicFile(targetFile)
    var output: FileOutputStream? = null

    try {
      output = atomicFile.startWrite()
      output.write(content.toByteArray(StandardCharsets.UTF_8))
      atomicFile.finishWrite(output)
    } catch (exception: Exception) {
      output?.let(atomicFile::failWrite)
      throw storageFailure("Interpretation run artifact could not be written.", exception)
    }
  }

  private fun interpretationAttemptToJson(attempt: FieldInterpretationAttempt): JSONObject {
    return JSONObject()
      .put("fieldKey", attempt.fieldKey.value)
      .put("fieldIndex", attempt.fieldIndex)
      .put("status", attempt.status.wireValue)
      .put("durationMs", attempt.durationMs)
      .put("outputLength", attempt.outputLength ?: JSONObject.NULL)
      .put("raw", attempt.raw ?: JSONObject.NULL)
      .apply {
        attempt.failureCode?.let { put("failureCode", it.wireValue) }
        attempt.phase?.let { put("phase", it.name.lowercase()) }
      }
  }

  private fun ensureDirectoryExists(directory: File) {
    if (directory.exists()) {
      if (!directory.isDirectory) {
        throw storageFailure("Interpretation run storage is not available.")
      }
      return
    }
    if (!directory.mkdirs()) {
      throw storageFailure("Interpretation run storage could not be prepared.")
    }
  }

  private fun createOrTruncate(file: File) {
    try {
      FileOutputStream(file, false).use { output ->
        output.flush()
      }
    } catch (exception: IOException) {
      throw storageFailure("Interpretation run audio could not be prepared.", exception)
    }
  }

  private fun deleteRunDirectory(runDirectory: File) {
    val deleted = deleteDirectoryTree(runDirectory)
    if (!deleted || runDirectory.exists()) {
      throw storageFailure("Interpretation run could not be deleted.")
    }
  }

  private fun deleteTemporaryArtifact(file: File) {
    file.delete()
  }

  private fun storageFailure(message: String, cause: Throwable? = null): InterpretationArtifactStorageException {
    return InterpretationArtifactStorageException(message, cause)
  }

  private fun isStale(referenceEpochMs: Long, nowEpochMs: Long): Boolean {
    if (referenceEpochMs > nowEpochMs) {
      return false
    }
    return nowEpochMs - referenceEpochMs >= cleanupPolicy.staleRecordingAfterMs
  }

  private fun isTemporaryArtifact(file: File): Boolean {
    return file.name.endsWith(".new") || file.name.endsWith(".bak")
  }

  private val FieldInterpretationAttemptStatus.wireValue: String
    get() = when (this) {
      FieldInterpretationAttemptStatus.DECODED -> "decoded"
      FieldInterpretationAttemptStatus.DECODING_FAILED -> "decoding_failed"
      FieldInterpretationAttemptStatus.GENERATION_FAILED -> "generation_failed"
      FieldInterpretationAttemptStatus.CANCELLED -> "cancelled"
    }

  private val InterpretationFailureCode.wireValue: String
    get() = when (this) {
      InterpretationFailureCode.MODEL_UNAVAILABLE -> "model_unavailable"
      InterpretationFailureCode.MODEL_CORRUPT -> "model_corrupt"
      InterpretationFailureCode.UNSUPPORTED_DEVICE -> "unsupported_device"
      InterpretationFailureCode.INFERENCE_FAILED -> "inference_failed"
      InterpretationFailureCode.MALFORMED_OUTPUT -> "malformed_output"
      InterpretationFailureCode.CANCELLED -> "cancelled"
      InterpretationFailureCode.INVALID_REQUEST -> "invalid_request"
    }

  private data class RunManifest(
    val version: Int = 1,
    val runId: String,
    val createdAtEpochMs: Long,
    val updatedAtEpochMs: Long,
    val status: String,
    val audio: AudioArtifactMetadata? = null,
    val transcription: TranscriptMetadata? = null,
    val interpretation: InterpretationMetadata? = null,
    val failure: FailureMetadata? = null,
  ) {
    fun toJson(): JSONObject = JSONObject()
      .put("version", version)
      .put("runId", runId)
      .put("createdAtEpochMs", createdAtEpochMs)
      .put("updatedAtEpochMs", updatedAtEpochMs)
      .put("status", status)
      .put(
        "artifacts",
        JSONObject()
          .put("audio", "audio.wav")
          .put("transcript", "transcript.v1.json")
          .put("interpretation", "interpretation.v1.json")
      )
      .apply {
        audio?.let {
          put(
            "audio",
            JSONObject()
              .put("mimeType", it.mimeType)
              .put("durationMs", it.durationMs)
              .put("sizeBytes", it.sizeBytes)
          )
        }
        transcription?.let {
          put(
            "transcription",
            JSONObject()
              .put("completedAtEpochMs", it.completedAtEpochMs)
              .apply {
                if (it.language != null) {
                  put("language", it.language)
                }
              }
          )
        }
        interpretation?.let {
          put(
            "interpretation",
            JSONObject()
              .put("completedAtEpochMs", it.completedAtEpochMs)
              .put("contractVersion", it.contractVersion)
              .put("specId", it.specId)
              .put("specVersion", it.specVersion)
              .apply {
                if (it.resolvedFieldCount != null) {
                  put("resolvedFieldCount", it.resolvedFieldCount)
                }
                if (it.quality != null) {
                  put("quality", it.quality)
                }
              }
          )
        }
        failure?.let {
          put("failure", JSONObject().apply {
            put("stage", it.stage)
            put("code", it.code)
            put("failureCode", it.failureCode ?: it.code)
            it.phase?.let { phase -> put("phase", phase) }
            it.recoverable?.let { recoverable -> put("recoverable", recoverable) }
            it.exceptionType?.let { exceptionType -> put("exceptionType", exceptionType) }
            it.message?.let { message -> put("message", message) }
            it.modelId?.let { modelId -> put("modelId", modelId) }
            it.modelVersion?.let { modelVersion -> put("modelVersion", modelVersion) }
            it.backend?.let { backend -> put("backend", backend) }
            it.fieldKey?.let { fieldKey -> put("fieldKey", fieldKey) }
            it.fieldIndex?.let { fieldIndex -> put("fieldIndex", fieldIndex) }
            it.fieldCount?.let { fieldCount -> put("fieldCount", fieldCount) }
            it.durationMs?.let { durationMs -> put("durationMs", durationMs) }
            it.outputLength?.let { outputLength -> put("outputLength", outputLength) }
            if (it.completedFieldKeys.isNotEmpty()) {
              put("completedFieldKeys", org.json.JSONArray(it.completedFieldKeys))
            }
            it.failedFieldKey?.let { failedFieldKey -> put("failedFieldKey", failedFieldKey) }
          })
        }
      }

    companion object {
      fun recording(runId: String, createdAtEpochMs: Long): RunManifest {
        return RunManifest(
          runId = runId,
          createdAtEpochMs = createdAtEpochMs,
          updatedAtEpochMs = createdAtEpochMs,
          status = "recording",
        )
      }

      fun fromJson(json: String): RunManifest {
        val root = JSONObject(json)
        return RunManifest(
          version = root.getInt("version"),
          runId = root.getString("runId"),
          createdAtEpochMs = root.getLong("createdAtEpochMs"),
          updatedAtEpochMs = root.getLong("updatedAtEpochMs"),
          status = root.getString("status"),
          audio = root.optJSONObject("audio")?.let {
            AudioArtifactMetadata(
              mimeType = it.getString("mimeType"),
              durationMs = it.getLong("durationMs"),
              sizeBytes = it.getLong("sizeBytes"),
            )
          },
          transcription = root.optJSONObject("transcription")?.let {
            TranscriptMetadata(
              completedAtEpochMs = it.getLong("completedAtEpochMs"),
              language = it.optString("language").takeIf { value -> value.isNotBlank() },
            )
          },
          interpretation = root.optJSONObject("interpretation")?.let {
            InterpretationMetadata(
              completedAtEpochMs = it.getLong("completedAtEpochMs"),
              contractVersion = it.optString("contractVersion").takeIf { value -> value.isNotBlank() } ?: "1",
              specId = it.getString("specId"),
              specVersion = it.getString("specVersion"),
              resolvedFieldCount = if (it.has("resolvedFieldCount") && !it.isNull("resolvedFieldCount")) it.getInt("resolvedFieldCount") else null,
              quality = it.optString("quality").takeIf { value -> value.isNotBlank() },
            )
          },
          failure = root.optJSONObject("failure")?.let {
            FailureMetadata(
              stage = it.getString("stage"),
              code = it.getString("code"),
              failureCode = it.optString("failureCode").takeIf { value -> value.isNotBlank() },
              phase = it.optString("phase").takeIf { value -> value.isNotBlank() },
              recoverable = if (it.has("recoverable")) it.getBoolean("recoverable") else null,
              exceptionType = it.optString("exceptionType").takeIf { value -> value.isNotBlank() },
              message = it.optString("message").takeIf { value -> value.isNotBlank() },
              modelId = it.optString("modelId").takeIf { value -> value.isNotBlank() },
              modelVersion = it.optString("modelVersion").takeIf { value -> value.isNotBlank() },
              backend = it.optString("backend").takeIf { value -> value.isNotBlank() },
              fieldKey = it.optString("fieldKey").takeIf { value -> value.isNotBlank() },
              fieldIndex = if (it.has("fieldIndex") && !it.isNull("fieldIndex")) it.getInt("fieldIndex") else null,
              fieldCount = if (it.has("fieldCount") && !it.isNull("fieldCount")) it.getInt("fieldCount") else null,
              durationMs = if (it.has("durationMs") && !it.isNull("durationMs")) it.getLong("durationMs") else null,
              outputLength = if (it.has("outputLength") && !it.isNull("outputLength")) it.getInt("outputLength") else null,
              completedFieldKeys = it.optJSONArray("completedFieldKeys")?.let { values ->
                buildList(values.length()) {
                  for (index in 0 until values.length()) add(values.getString(index))
                }
              } ?: emptyList(),
              failedFieldKey = it.optString("failedFieldKey").takeIf { value -> value.isNotBlank() },
            )
          },
        )
      }
    }

  }

  private data class TranscriptMetadata(
    val completedAtEpochMs: Long,
    val language: String?,
  )

  private data class InterpretationMetadata(
    val completedAtEpochMs: Long,
    val contractVersion: String,
    val specId: String,
    val specVersion: String,
    val resolvedFieldCount: Int? = null,
    val quality: String? = null,
  )

  private data class FailureMetadata(
    val stage: String,
    val code: String,
    val failureCode: String? = null,
    val phase: String? = null,
    val recoverable: Boolean? = null,
    val exceptionType: String? = null,
    val message: String? = null,
    val modelId: String? = null,
    val modelVersion: String? = null,
    val backend: String? = null,
    val fieldKey: String? = null,
    val fieldIndex: Int? = null,
    val fieldCount: Int? = null,
    val durationMs: Long? = null,
    val outputLength: Int? = null,
    val completedFieldKeys: List<String> = emptyList(),
    val failedFieldKey: String? = null,
  )
}
