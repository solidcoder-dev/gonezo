package com.gonezo.multiplatform.infrastructure.transcription.android

import android.content.Context
import android.content.Intent
import android.media.AudioFormat
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.os.Bundle
import com.gonezo.multiplatform.infrastructure.transcription.TranscriptionFailureCodes
import com.gonezo.multiplatform.infrastructure.transcription.runtime.AndroidSpeechTranscriber
import com.gonezo.multiplatform.infrastructure.transcription.runtime.OnDeviceSpeechRecognizer
import dev.solidcoder.speech.AudioSourceRef
import dev.solidcoder.speech.Transcript
import dev.solidcoder.speech.TranscriptionIssue
import dev.solidcoder.speech.TranscriptionIssueSeverity
import dev.solidcoder.speech.TranscriptionRequest
import dev.solidcoder.speech.TranscriptionResult
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

internal class AndroidOnDeviceSpeechTranscriber(
  private val sourceResolver: (AudioSourceRef) -> File,
  private val recognizerFactory: OnDeviceSpeechRecognizerFactory,
  private val mainHandler: Handler = Handler(Looper.getMainLooper()),
  private val resultTimeoutSeconds: Long = 30L,
) : AndroidSpeechTranscriber {
  private val activeRequest = AtomicReference<RecognitionRequest?>()
  private val closed = AtomicBoolean(false)

  override fun transcribeBlocking(request: TranscriptionRequest): TranscriptionResult {
    check(!closed.get()) { "on-device speech transcriber is closed" }
    val audioFile = try {
      sourceResolver(request.audioSource)
    } catch (exception: Exception) {
      return failure(TranscriptionFailureCodes.AUDIO_NOT_FOUND, exception.message ?: "Audio source was not found.", false)
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      return failure(TranscriptionFailureCodes.TRANSCRIPTION_UNAVAILABLE, "On-device audio-source recognition requires Android 13 or newer.", true)
    }

    val descriptor = try {
      ParcelFileDescriptor.open(audioFile, ParcelFileDescriptor.MODE_READ_ONLY)
    } catch (exception: Exception) {
      return failure(TranscriptionFailureCodes.INVALID_AUDIO, exception.message ?: "Audio source could not be opened.", false)
    }
    val operation = RecognitionRequest(descriptor)
    if (!activeRequest.compareAndSet(null, operation)) {
      descriptor.close()
      return failure(TranscriptionFailureCodes.TRANSCRIPTION_UNAVAILABLE, "On-device speech transcription is already active.", true)
    }
    try {
      mainHandler.post {
        try {
          val recognizer = recognizerFactory.create()
          operation.recognizer = recognizer
          recognizer.setRecognitionListener(operation.listener)
          recognizer.startListening(createIntent(request, descriptor))
        } catch (exception: Exception) {
          operation.complete(failure(TranscriptionFailureCodes.NATIVE_TRANSCRIPTION_FAILED, exception.message ?: "On-device speech transcription failed.", true))
        }
      }
      operation.finished.await(resultTimeoutSeconds, TimeUnit.SECONDS)
      return operation.result.get() ?: failure(TranscriptionFailureCodes.NATIVE_TRANSCRIPTION_FAILED, "On-device speech transcription timed out.", true)
    } catch (_: InterruptedException) {
      Thread.currentThread().interrupt()
      return failure(TranscriptionFailureCodes.TRANSCRIPTION_CANCELLED, "Speech transcription was cancelled.", true)
    } finally {
      operation.close()
      activeRequest.compareAndSet(operation, null)
    }
  }

  override suspend fun transcribe(request: TranscriptionRequest): TranscriptionResult = transcribeBlocking(request)

  override fun cancelBlocking() {
    activeRequest.get()?.let { operation ->
      operation.cancelRequested.set(true)
      mainHandler.post {
        operation.recognizer?.cancel()
        operation.complete(failure(TranscriptionFailureCodes.TRANSCRIPTION_CANCELLED, "Speech transcription was cancelled.", true))
      }
    }
  }

  override fun close() {
    if (closed.compareAndSet(false, true)) {
      cancelBlocking()
      activeRequest.get()?.close()
    }
  }

  private fun createIntent(request: TranscriptionRequest, descriptor: ParcelFileDescriptor): Intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
    putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE, descriptor)
    putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_CHANNEL_COUNT, 1)
    putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_ENCODING, AudioFormat.ENCODING_PCM_16BIT)
    putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_SAMPLING_RATE, 16_000)
    putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
    request.language?.let { putExtra(RecognizerIntent.EXTRA_LANGUAGE, it) }
    putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
  }

  private fun failure(code: String, message: String, recoverable: Boolean): TranscriptionResult = TranscriptionResult.failure(
    TranscriptionIssue(code, message, if (recoverable) TranscriptionIssueSeverity.RECOVERABLE else TranscriptionIssueSeverity.DEFINITIVE, recoverable, recoverable),
  )

  private class RecognitionRequest(
    private val descriptor: ParcelFileDescriptor,
  ) {
    val finished = CountDownLatch(1)
    val result = AtomicReference<TranscriptionResult?>()
    val cancelRequested = AtomicBoolean(false)
    var recognizer: OnDeviceSpeechRecognizer? = null
    val listener = object : RecognitionListener {
      override fun onResults(results: Bundle?) {
        val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim().orEmpty()
        if (text.isBlank()) {
          complete(transcriptionFailure(TranscriptionFailureCodes.TRANSCRIPTION_EMPTY, "On-device speech transcription returned no text.", true))
        } else {
          complete(TranscriptionResult.success(Transcript(text)))
        }
      }

      override fun onError(error: Int) {
        if (!cancelRequested.get()) {
          complete(transcriptionFailure(TranscriptionFailureCodes.NATIVE_TRANSCRIPTION_FAILED, "On-device speech transcription failed with code $error.", true))
        }
      }

      override fun onPartialResults(partialResults: Bundle?) = Unit
      override fun onReadyForSpeech(params: Bundle?) = Unit
      override fun onBeginningOfSpeech() = Unit
      override fun onRmsChanged(rmsdB: Float) = Unit
      override fun onBufferReceived(buffer: ByteArray?) = Unit
      override fun onEndOfSpeech() = Unit
      override fun onEvent(eventType: Int, params: Bundle?) = Unit
    }

    fun complete(nextResult: TranscriptionResult) {
      if (result.compareAndSet(null, nextResult)) finished.countDown()
    }

    fun close() {
      recognizer?.destroy()
      descriptor.close()
    }
  }
}

private fun transcriptionFailure(code: String, message: String, recoverable: Boolean): TranscriptionResult = TranscriptionResult.failure(
  TranscriptionIssue(code, message, if (recoverable) TranscriptionIssueSeverity.RECOVERABLE else TranscriptionIssueSeverity.DEFINITIVE, recoverable, recoverable),
)

internal fun interface OnDeviceSpeechRecognizerFactory {
  fun create(): OnDeviceSpeechRecognizer
}

internal class AndroidOnDeviceSpeechRecognizerFactory(
  private val context: Context,
) : OnDeviceSpeechRecognizerFactory {
  override fun create(): OnDeviceSpeechRecognizer {
    check(Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(context)) {
      "On-device speech recognition is unavailable."
    }
    return SpeechRecognizerAdapter(SpeechRecognizer.createOnDeviceSpeechRecognizer(context))
  }
}

private class SpeechRecognizerAdapter(
  private val delegate: SpeechRecognizer,
) : OnDeviceSpeechRecognizer {
  override fun setRecognitionListener(listener: RecognitionListener) = delegate.setRecognitionListener(listener)
  override fun startListening(intent: Intent) = delegate.startListening(intent)
  override fun stopListening() = delegate.stopListening()
  override fun cancel() = delegate.cancel()
  override fun destroy() = delegate.destroy()
}
