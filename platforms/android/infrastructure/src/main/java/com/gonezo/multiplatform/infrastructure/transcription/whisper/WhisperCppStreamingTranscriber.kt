package com.gonezo.multiplatform.infrastructure.transcription.whisper

import com.gonezo.multiplatform.infrastructure.transcription.TranscriptionFailureCodes
import com.gonezo.multiplatform.infrastructure.transcription.model.ModelProvider
import com.gonezo.multiplatform.infrastructure.transcription.runtime.AndroidStreamingSpeechTranscriber
import com.gonezo.multiplatform.infrastructure.transcription.runtime.AndroidStreamingTranscriptionSession
import dev.solidcoder.speech.AudioChunk
import dev.solidcoder.speech.StreamingTranscriptionRequest
import dev.solidcoder.speech.StreamingTranscriptionSession
import dev.solidcoder.speech.TranscriptionIssue
import dev.solidcoder.speech.TranscriptionIssueSeverity
import dev.solidcoder.speech.TranscriptionResult
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.runBlocking

internal class WhisperCppStreamingTranscriber(
  private val modelProvider: ModelProvider,
  private val nativeBridge: WhisperNativeBridgeApi = WhisperNativeBridge,
  private val threadCount: Int = Runtime.getRuntime().availableProcessors().coerceIn(1, 4),
) : AndroidStreamingSpeechTranscriber {
  private val contextLock = Any()
  private var context = 0L
  private var contextModelPath: String? = null

  override suspend fun start(request: StreamingTranscriptionRequest): StreamingTranscriptionSession = startBlocking(request)

  override fun startBlocking(request: StreamingTranscriptionRequest): AndroidStreamingTranscriptionSession {
    val modelPath = modelProvider.modelPath()
    val resolvedLanguage = request.language?.trim().takeUnless(String?::isNullOrBlank) ?: "auto"
    if (!request.detectLanguageAutomatically && nativeBridge.languageId(resolvedLanguage) < 0) {
      throw IllegalArgumentException("Speech transcription language is not supported.")
    }
    val activeContext = synchronized(contextLock) {
      ensureContext(modelPath)
      if (request.detectLanguageAutomatically || nativeBridge.isMultilingual(context)) {
        context
      } else {
        throw IllegalArgumentException("The loaded speech model does not support this transcription language.")
      }
    }
    return WhisperCppStreamingSession(
      context = activeContext,
      language = resolvedLanguage,
      detectLanguageAutomatically = request.detectLanguageAutomatically,
      threadCount = threadCount,
      nativeBridge = nativeBridge,
    )
  }

  override fun close() = synchronized(contextLock) {
    if (context != 0L) {
      nativeBridge.freeContext(context)
      context = 0L
      contextModelPath = null
    }
  }

  private fun ensureContext(modelPath: String) {
    require(modelPath.isNotBlank()) { "speech model path is required" }
    if (context != 0L && contextModelPath == modelPath) return
    if (context != 0L) nativeBridge.freeContext(context)
    context = nativeBridge.initContext(modelPath)
    require(context != 0L) { "speech model could not be loaded" }
    contextModelPath = modelPath
  }
}

private class WhisperCppStreamingSession(
  private val context: Long,
  private val language: String,
  private val detectLanguageAutomatically: Boolean,
  private val threadCount: Int,
  private val nativeBridge: WhisperNativeBridgeApi,
) : AndroidStreamingTranscriptionSession {
  private val state = AtomicReference(SessionState.CREATED)
  private val commands = ArrayBlockingQueue<Command>(MAX_BUFFERED_CHUNKS)
  private val finished = CountDownLatch(1)
  private val result = AtomicReference<TranscriptionResult>()
  private val window = RollingAudioWindow(SAMPLE_RATE_HZ)
  private val merger = WhisperTranscriptMerger()
  private val worker = Thread(::processCommands, "GonezoWhisperStreaming")
  private var inferenceCount = 0
  private var totalInferenceMs = 0L
  private var firstInferenceMs: Long? = null
  private val startedAt = System.currentTimeMillis()
  private var finishRequestedAt: Long? = null

  init {
    worker.start()
  }

  override suspend fun accept(chunk: AudioChunk) = acceptBlocking(chunk)

  override fun acceptBlocking(chunk: AudioChunk) {
    check(state.compareAndSet(SessionState.CREATED, SessionState.RUNNING) || state.get() == SessionState.RUNNING) {
      "streaming transcription session is not accepting audio"
    }
    commands.put(Command.Chunk(AudioChunk(chunk.samples.copyOf(), chunk.sampleRateHz)))
  }

  override suspend fun finish(): TranscriptionResult = finishBlocking()

  override fun finishBlocking(): TranscriptionResult {
    finishRequestedAt = System.currentTimeMillis()
    check(state.compareAndSet(SessionState.CREATED, SessionState.FINISHING) || state.compareAndSet(SessionState.RUNNING, SessionState.FINISHING)) {
      "streaming transcription session cannot be finished"
    }
    commands.put(Command.Finish)
    finished.await()
    return result.get() ?: failure(
      TranscriptionFailureCodes.TRANSCRIPTION_CANCELLED,
      "Speech transcription was cancelled.",
      true,
    )
  }

  override suspend fun cancel() = cancelBlocking()

  override fun cancelBlocking() {
    val previous = state.getAndSet(SessionState.CANCELLED)
    if (previous == SessionState.FINISHED || previous == SessionState.CANCELLED) return
    nativeBridge.cancel(context)
    commands.clear()
    commands.offer(Command.Cancel)
    finished.await(CANCEL_TIMEOUT_SECONDS, TimeUnit.SECONDS)
  }

  private fun processCommands() {
    try {
      while (true) {
        when (val command = commands.take()) {
          is Command.Chunk -> {
            if (state.get() == SessionState.CANCELLED) return
            window.append(command.chunk)
            processReadyWindows(finalize = false)
          }
          Command.Finish -> {
            processReadyWindows(finalize = true)
            result.set(finalResult())
            state.set(SessionState.FINISHED)
            return
          }
          Command.Cancel -> return
        }
      }
    } catch (exception: Exception) {
      state.set(SessionState.FAILED)
      result.set(failure(TranscriptionFailureCodes.NATIVE_TRANSCRIPTION_FAILED, exception.message ?: "Local speech transcription failed.", true))
    } finally {
      finished.countDown()
      logDiagnostics()
    }
  }

  private fun processReadyWindows(finalize: Boolean) {
    while (true) {
      val samples = window.takeReadyWindow(finalize) ?: return
      transcribeWindow(samples)
    }
  }

  private fun transcribeWindow(samples: FloatArray) {
    val inferenceStartedAt = System.currentTimeMillis()
    val payload = parseWhisperNativeTranscriptionPayload(
      nativeBridge.transcribe(context, threadCount, language, detectLanguageAutomatically, samples),
    )
    inferenceCount++
    val inferenceDurationMs = System.currentTimeMillis() - inferenceStartedAt
    firstInferenceMs = firstInferenceMs ?: (System.currentTimeMillis() - startedAt)
    totalInferenceMs += inferenceDurationMs
    when (payload) {
      is WhisperNativeTranscriptionPayload.Failure -> {
        result.compareAndSet(null, failure(payload.code, payload.message, payload.recoverable, payload.retryable))
      }
      is WhisperNativeTranscriptionPayload.Success -> merger.add(payload.text)
    }
  }

  private fun finalResult(): TranscriptionResult {
    result.get()?.let { return it }
    val text = merger.text()
    return if (text.isBlank()) {
      failure(TranscriptionFailureCodes.NO_SPEECH_DETECTED, "No speech was detected in the recording.", true)
    } else {
      TranscriptionResult.success(dev.solidcoder.speech.Transcript(text))
    }
  }

  private fun failure(code: String, message: String, recoverable: Boolean, retryable: Boolean = recoverable) = TranscriptionResult.failure(
    TranscriptionIssue(
      code,
      message,
      if (recoverable) TranscriptionIssueSeverity.RECOVERABLE else TranscriptionIssueSeverity.DEFINITIVE,
      recoverable,
      retryable,
    ),
  )

  private fun logDiagnostics() {
    android.util.Log.i(
      "GonezoWhisperStreaming",
      "recording_duration_ms=${System.currentTimeMillis() - startedAt}, " +
        "streaming_first_inference_ms=${firstInferenceMs ?: -1}, " +
        "streaming_inference_count=$inferenceCount, streaming_total_inference_ms=$totalInferenceMs, " +
        "streaming_finalize_ms=${finishRequestedAt?.let { System.currentTimeMillis() - it } ?: -1}, " +
        "stop_to_final_transcript_ms=${finishRequestedAt?.let { System.currentTimeMillis() - it } ?: -1}, " +
        "transcription_mode=STREAMING, transcription_provider=WHISPER_CPP",
    )
  }

  private sealed interface Command {
    data class Chunk(val chunk: AudioChunk) : Command
    data object Finish : Command
    data object Cancel : Command
  }

  private enum class SessionState { CREATED, RUNNING, FINISHING, FINISHED, CANCELLED, FAILED }

  companion object {
    private const val SAMPLE_RATE_HZ = 16_000
    private const val MAX_BUFFERED_CHUNKS = 32
    private const val CANCEL_TIMEOUT_SECONDS = 5L
  }
}
