package com.gonezo.multiplatform.plugins.speech

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.gonezo.multiplatform.plugins.interpretation.artifacts.AndroidPrivateInterpretationArtifactStore
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactStore
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationRunStage
import dev.solidcoder.speech.AudioSourceRef
import dev.solidcoder.speech.TranscriptionRequest
import dev.solidcoder.speech.TranscriptionResult
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import org.json.JSONArray
import org.json.JSONObject

@CapacitorPlugin(name = "SpeechTranscriptionPlugin")
class SpeechTranscriptionPlugin : Plugin() {
  private val executor: ExecutorService = Executors.newSingleThreadExecutor { runnable ->
    Thread(runnable, "GonezoSpeechTranscription")
  }
  private val cancellationExecutor: ExecutorService = Executors.newCachedThreadPool { runnable ->
    Thread(runnable, "GonezoSpeechTranscriptionCancellation")
  }
  private lateinit var artifactStore: InterpretationArtifactStore
  private lateinit var transcriptionFinalizer: SpeechTranscriptionRunFinalizer
  private var runtimeState: SpeechTranscriptionRuntimeState =
    SpeechTranscriptionRuntimeState.Unavailable(
      modelUnavailableSpeechTranscriptionIssue(),
    )
  private val activeOperation = AtomicReference<ActiveTranscriptionOperation?>(null)

  override fun load() {
    artifactStore = AndroidPrivateInterpretationArtifactStore(context.noBackupFilesDir)
    transcriptionFinalizer = SpeechTranscriptionRunFinalizer(artifactStore)
    runCatching {
      artifactStore.cleanupTemporaryArtifacts()
    }

    runtimeState = SpeechTranscriptionRuntimeInitializer(
      configurationReader = SpeechModelConfigurationReader(context),
      transcriberFactory = { configuration ->
        WhisperCppTranscriber(
          sourceResolver = { source -> artifactStore.resolveAudio(source.value) },
          modelProvider = AssetModelProvider(
            context = context,
            assetPath = configuration.assetPath,
            expectedSize = configuration.expectedSize,
            expectedSha256 = configuration.expectedSha256,
          ),
        )
      },
    ).initialize()

    when (runtimeState) {
      is SpeechTranscriptionRuntimeState.Ready -> {
        Log.i(TAG, "Speech transcription plugin initialized.")
      }
      is SpeechTranscriptionRuntimeState.Unavailable -> {
        Log.e(TAG, "Speech transcription initialization failed.")
      }
    }
  }

  @PluginMethod
  fun transcribe(call: PluginCall) {
    val runId = call.getString("runId")
    val audioRef = call.getString("audioRef")
    if (runId.isNullOrBlank() || audioRef.isNullOrBlank()) {
      reject(call, "invalid-audio", "Audio source reference is required.", false)
      return
    }
    if (runId != audioRef) {
      reject(call, "invalid-audio", "Audio source reference is invalid.", false)
      return
    }
    try {
      UUID.fromString(runId)
    } catch (_: IllegalArgumentException) {
      reject(call, "invalid-audio", "Audio source reference is invalid.", false)
      return
    }

    val operation = ActiveTranscriptionOperation(
      runId = runId,
      call = call,
    )
    if (!activeOperation.compareAndSet(null, operation)) {
      reject(call, "transcription-unavailable", "Speech transcription is already active.", true)
      return
    }

    val language = call.getString("language")
    val detectAutomatically = call.getBoolean("detectLanguageAutomatically", language == null) ?: (language == null)
    val future = executor.submit {
      try {
        if (operation.cancelRequested.get()) {
          completeCancelledTranscription(operation)
          return@submit
        }

        val result = when (val state = runtimeState) {
          is SpeechTranscriptionRuntimeState.Ready ->
            try {
              state.transcriber.transcribeBlocking(
                TranscriptionRequest(AudioSourceRef.of(runId), language, detectAutomatically),
              )
            } catch (exception: RuntimeException) {
              TranscriptionResult.failure(
                dev.solidcoder.speech.TranscriptionIssue(
                  SpeechTranscriptionFailureCodes.NATIVE_TRANSCRIPTION_FAILED,
                  exception.message ?: "Speech transcription failed.",
                  dev.solidcoder.speech.TranscriptionIssueSeverity.DEFINITIVE,
                ),
              )
            }
          is SpeechTranscriptionRuntimeState.Unavailable ->
            TranscriptionResult.failure(state.issue)
        }

        if (operation.cancelRequested.get()) {
          completeCancelledTranscription(operation)
          return@submit
        }

        handleTranscription(operation, language, detectAutomatically, result)
      } finally {
        operation.completion.countDown()
        activeOperation.compareAndSet(operation, null)
      }
    }
    operation.future.set(future)
    if (operation.cancelRequested.get()) {
      future.cancel(true)
    }
  }

  @PluginMethod
  fun cancel(call: PluginCall) {
    val operation = activeOperation.get()
    if (operation == null) {
      call.resolve()
      return
    }

    operation.cancelRequested.set(true)
    readyTranscriber()?.cancelBlocking()
    operation.future.get()?.cancel(true)

    cancellationExecutor.execute {
      val completed = try {
        operation.completion.await(CANCELLATION_TIMEOUT_SECONDS, TimeUnit.SECONDS)
      } catch (_: InterruptedException) {
        Thread.currentThread().interrupt()
        false
      }
      if (completed) {
        resolveOnMainThread(call)
      } else {
        rejectOnMainThread(
          call,
          "transcription-cancellation-failed",
          "Speech transcription cancellation timed out.",
          true,
        )
      }
    }
  }

  override fun handleOnDestroy() {
    activeOperation.get()?.cancelRequested?.set(true)
    readyTranscriber()?.cancelBlocking()
    readyTranscriber()?.close()
    activeOperation.getAndSet(null)?.future?.get()?.cancel(true)
    executor.shutdownNow()
    cancellationExecutor.shutdownNow()
    super.handleOnDestroy()
  }

  private fun handleTranscription(
    operation: ActiveTranscriptionOperation,
    language: String?,
    detectAutomatically: Boolean,
    result: TranscriptionResult,
  ) {
    if (operation.cancelRequested.get()) {
      completeCancelledTranscription(operation)
      return
    }

    transcriptionFinalizer.completeTranscription(
      runId = operation.runId,
      language = language,
      detectAutomatically = detectAutomatically,
      transcript = result.transcript,
      issues = result.issues,
      onResolve = {
        if (operation.cancelRequested.get()) {
          completeCancelledTranscription(operation)
        } else {
          resolve(operation.call, result, language)
        }
      },
      onArtifactStorageFailure = {
        if (operation.cancelRequested.get()) {
          completeCancelledTranscription(operation)
        } else {
          rejectArtifactStorage(operation.call)
        }
      },
      markStorageFailure = {
        runCatching {
          artifactStore.markFailed(
            operation.runId,
            InterpretationRunStage.STORAGE,
            SpeechTranscriptionFailureCodes.ARTIFACT_STORAGE_FAILED,
          )
        }
      },
    )
  }

  private fun completeCancelledTranscription(operation: ActiveTranscriptionOperation) {
    if (operation.originalResponseCompleted.compareAndSet(false, true)) {
      rejectOnMainThread(
        operation.call,
        "transcription-cancelled",
        "Speech transcription was cancelled.",
        true,
      )
    }
  }

  private fun resolve(call: PluginCall, result: TranscriptionResult, language: String?) {
    val payload = JSObject()
    if (!language.isNullOrBlank()) {
      payload.put("language", language)
    }
    val transcript = result.transcript
    if (transcript != null) {
      val transcriptText = transcript.text
      val segments = transcript.segments
      val transcriptPayload = JSObject().put("text", transcriptText)
      if (segments.isNotEmpty()) {
        transcriptPayload.put(
          "segments",
          JSONArray(segments.map { segment ->
            JSONObject()
              .put("text", segment.text)
              .put("startMs", segment.startMs)
              .put("endMs", segment.endMs)
              .put("noSpeechProbability", segment.noSpeechProbability)
          }),
        )
      }
      payload.put("transcript", transcriptPayload)
    }
    result.issues.firstOrNull()?.let { issue ->
      payload.put(
        "error",
        JSObject()
          .put("code", issue.code)
          .put("message", issue.message)
          .put("recoverable", issue.recoverable)
          .put("retryable", issue.retryable),
      )
    }
    resolveOnMainThread(call, payload)
  }

  private fun resolveOnMainThread(call: PluginCall, payload: JSObject = JSObject()) {
    getBridge().executeOnMainThread { call.resolve(payload) }
  }

  private fun rejectOnMainThread(call: PluginCall, code: String, message: String, recoverable: Boolean) {
    getBridge().executeOnMainThread {
      call.reject(message, code, JSObject().put("recoverable", recoverable))
    }
  }

  private fun reject(call: PluginCall, code: String, message: String, recoverable: Boolean) {
    call.reject(message, code, JSObject().put("recoverable", recoverable))
  }

  private fun rejectArtifactStorage(call: PluginCall) {
    getBridge().executeOnMainThread {
      call.reject(
        "Interpretation artifact storage failed.",
        "artifact-storage-failed",
        JSObject().put("recoverable", true).put("retryable", true),
      )
    }
  }

  private fun readyTranscriber(): WhisperCppTranscriber? {
    return (runtimeState as? SpeechTranscriptionRuntimeState.Ready)?.transcriber
  }

  companion object {
    private const val CANCELLATION_TIMEOUT_SECONDS = 10L
    private const val TAG = "GonezoSpeechTranscription"
  }

  private data class ActiveTranscriptionOperation(
    val runId: String,
    val call: PluginCall,
  ) {
    val cancelRequested = AtomicBoolean(false)
    val completion = CountDownLatch(1)
    val originalResponseCompleted = AtomicBoolean(false)
    val future = AtomicReference<Future<*>?>(null)
  }
}
