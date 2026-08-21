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

internal class WhisperCppStreamingTranscriber(
  private val modelProvider: ModelProvider,
  private val nativeBridge: WhisperNativeBridgeApi = WhisperNativeBridge,
  private val threadCount: Int = Runtime.getRuntime().availableProcessors().coerceIn(1, 4),
) : AndroidStreamingSpeechTranscriber {
  private val contextLock = Any()
  private var context = 0L
  private var contextModelPath: String? = null
  private var activeSession: WhisperCppStreamingSession? = null

  override suspend fun start(request: StreamingTranscriptionRequest): StreamingTranscriptionSession = startBlocking(request)

  override fun startBlocking(request: StreamingTranscriptionRequest): AndroidStreamingTranscriptionSession {
    val modelPath = modelProvider.modelPath()
    val resolvedLanguage = request.language?.trim().takeUnless(String?::isNullOrBlank) ?: "auto"
    synchronized(contextLock) {
      check(activeSession == null) { "a streaming transcription session is already active for the Whisper context" }
      ensureContext(modelPath)
      if (!request.detectLanguageAutomatically && nativeBridge.languageId(resolvedLanguage) < 0) {
        throw IllegalArgumentException("Speech transcription language is not supported.")
      }
      if (!request.detectLanguageAutomatically && !nativeBridge.isMultilingual(context)) {
        throw IllegalArgumentException("The loaded speech model does not support this transcription language.")
      }
      val session = WhisperCppStreamingSession(
        context = context,
        language = resolvedLanguage,
        detectLanguageAutomatically = request.detectLanguageAutomatically,
        threadCount = threadCount,
        nativeBridge = nativeBridge,
        onClosed = ::releaseSession,
      )
      activeSession = session
      return session
    }
  }

  override fun close() {
    val session = synchronized(contextLock) { activeSession }
    session?.cancelBlocking()
    synchronized(contextLock) {
      if (context != 0L) nativeBridge.freeContext(context)
      context = 0L
      contextModelPath = null
      activeSession = null
    }
  }

  private fun releaseSession(session: WhisperCppStreamingSession) {
    synchronized(contextLock) {
      if (activeSession === session) activeSession = null
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
  private val onClosed: (WhisperCppStreamingSession) -> Unit,
) : AndroidStreamingTranscriptionSession {
  private val state = AtomicReference(SessionState.CREATED)
  private val lifecycleLock = Any()
  private val commands = ArrayBlockingQueue<Command>(MAX_BUFFERED_CHUNKS)
  private val finished = CountDownLatch(1)
  private val result = AtomicReference<TranscriptionResult>()
  private val window = RollingAudioWindow(SAMPLE_RATE_HZ)
  private val merger = WhisperTranscriptMerger()
  private val worker = Thread(::processCommands, "GonezoWhisperStreaming")
  private var inferenceCount = 0
  private var totalInferenceMs = 0L
  private var firstInferenceMs: Long? = null
  private var chunksReceived = 0
  private var samplesReceived = 0L
  private var maxQueueDepth = 0
  private val startedAt = System.currentTimeMillis()
  private var finishRequestedAt: Long? = null

  init {
    worker.start()
  }

  override suspend fun accept(chunk: AudioChunk) = acceptBlocking(chunk)

  override fun acceptBlocking(chunk: AudioChunk) {
    val copy = chunk.samples.copyOf()
    enqueueAudio(Command.Samples(copy, chunk.sampleRateHz), copy.size)
  }

  override fun acceptPcm16NonBlocking(bytes: ByteArray, length: Int) {
    val copy = bytes.copyOf(length)
    enqueueAudio(Command.Pcm16(copy), length / 2)
  }

  private fun enqueueAudio(command: Command, sampleCount: Int) {
    synchronized(lifecycleLock) {
      val currentState = state.get()
      check(currentState == SessionState.CREATED || currentState == SessionState.RUNNING) {
        "streaming transcription session is not accepting audio in state $currentState"
      }
      if (!commands.offer(command)) {
        throw StreamingAudioBackpressureException("Streaming audio queue capacity is exhausted.")
      }
      state.compareAndSet(SessionState.CREATED, SessionState.RUNNING)
      chunksReceived++
      samplesReceived += sampleCount
      maxQueueDepth = maxOf(maxQueueDepth, commands.size)
    }
  }

  override suspend fun finish(): TranscriptionResult = finishBlocking()

  override fun finishBlocking(): TranscriptionResult {
    finishRequestedAt = System.currentTimeMillis()
    synchronized(lifecycleLock) {
      when (state.get()) {
        SessionState.CREATED, SessionState.RUNNING -> state.set(SessionState.FINISHING)
        SessionState.FINISHED -> error("streaming transcription session has already finished")
        SessionState.CANCELLED -> error("streaming transcription session was cancelled")
        SessionState.FINISHING -> error("streaming transcription session is already finishing")
        SessionState.FAILED -> return result.get() ?: failure(TranscriptionFailureCodes.NATIVE_TRANSCRIPTION_FAILED, "Local speech transcription failed.", true)
      }
      while (!commands.offer(Command.Finish)) {
        Thread.yield()
      }
    }
    finished.await()
    return result.get() ?: failure(TranscriptionFailureCodes.TRANSCRIPTION_CANCELLED, "Speech transcription was cancelled.", true)
  }

  override suspend fun cancel(): Unit = cancelBlocking()

  override fun cancelBlocking() {
    val previous = synchronized(lifecycleLock) {
      val current = state.get()
      if (current == SessionState.FINISHED || current == SessionState.CANCELLED) return
      state.set(SessionState.CANCELLED)
      commands.clear()
      commands.offer(Command.Cancel)
      current
    }
    if (previous != SessionState.FAILED) nativeBridge.cancel(context)
    finished.await(CANCEL_TIMEOUT_SECONDS, TimeUnit.SECONDS)
  }

  private fun processCommands() {
    try {
      while (true) {
        when (val command = commands.take()) {
          is Command.Samples -> processSamples(command.samples, command.sampleRateHz)
          is Command.Pcm16 -> processPcm16(command.bytes)
          Command.Finish -> {
            processReadyWindows(finalize = true)
            result.compareAndSet(null, finalResult())
            state.set(SessionState.FINISHED)
            return
          }
          Command.Cancel -> return
        }
      }
    } catch (exception: Exception) {
      if (state.get() != SessionState.CANCELLED) {
        state.set(SessionState.FAILED)
        result.set(failure(TranscriptionFailureCodes.NATIVE_TRANSCRIPTION_FAILED, exception.message ?: "Local speech transcription failed.", true))
      }
    } finally {
      finished.countDown()
      onClosed(this)
      logDiagnostics()
    }
  }

  private fun processPcm16(bytes: ByteArray) {
    val samples = FloatArray(bytes.size / 2)
    for (index in samples.indices) {
      val low = bytes[index * 2].toInt() and 0xff
      val high = bytes[index * 2 + 1].toInt()
      samples[index] = (((high shl 8) or low) / 32768f)
    }
    processSamples(samples, SAMPLE_RATE_HZ)
  }

  private fun processSamples(samples: FloatArray, sampleRateHz: Int) {
    window.append(AudioChunk(samples, sampleRateHz))
    processReadyWindows(finalize = false)
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
    totalInferenceMs += System.currentTimeMillis() - inferenceStartedAt
    firstInferenceMs = firstInferenceMs ?: (System.currentTimeMillis() - startedAt)
    when (payload) {
      is WhisperNativeTranscriptionPayload.Failure -> result.compareAndSet(null, failure(payload.code, payload.message, payload.recoverable, payload.retryable))
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
    TranscriptionIssue(code, message, if (recoverable) TranscriptionIssueSeverity.RECOVERABLE else TranscriptionIssueSeverity.DEFINITIVE, recoverable, retryable),
  )

  private fun logDiagnostics() {
    android.util.Log.i(
      "GonezoWhisperStreaming",
      "recording_duration_ms=" + (System.currentTimeMillis() - startedAt) + ", " +
        "audio_chunks_received=" + chunksReceived + ", audio_samples_received=" + samplesReceived + ", max_audio_queue_depth=" + maxQueueDepth + ", " +
        "streaming_inference_count=" + inferenceCount + ", streaming_total_inference_ms=" + totalInferenceMs + ", " +
        "streaming_finalize_ms=" + (finishRequestedAt?.let { System.currentTimeMillis() - it } ?: -1) + ", " +
        "stop_to_final_transcript_ms=" + (finishRequestedAt?.let { System.currentTimeMillis() - it } ?: -1) + ", " +
        "mode=STREAMING, provider=WHISPER_CPP",
    )
  }

  private sealed interface Command {
    data class Samples(val samples: FloatArray, val sampleRateHz: Int) : Command
    data class Pcm16(val bytes: ByteArray) : Command
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

internal class StreamingAudioBackpressureException(message: String) : IllegalStateException(message)
