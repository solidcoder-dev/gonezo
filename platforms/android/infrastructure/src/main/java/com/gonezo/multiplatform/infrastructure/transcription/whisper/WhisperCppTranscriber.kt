package com.gonezo.multiplatform.infrastructure.transcription.whisper

import com.gonezo.multiplatform.infrastructure.transcription.audio.DefaultTranscriptQualityPolicy
import com.gonezo.multiplatform.infrastructure.transcription.audio.DefaultTranscriptTextValidator
import com.gonezo.multiplatform.infrastructure.transcription.audio.EnergyBasedSpeechAudioPreprocessor
import com.gonezo.multiplatform.infrastructure.transcription.audio.SpeechAudioPreparation
import com.gonezo.multiplatform.infrastructure.transcription.audio.SpeechAudioPreprocessor
import com.gonezo.multiplatform.infrastructure.transcription.audio.TranscriptQualityPolicy
import com.gonezo.multiplatform.infrastructure.transcription.audio.TranscriptQualityResult
import com.gonezo.multiplatform.infrastructure.transcription.audio.TranscriptTextValidation
import com.gonezo.multiplatform.infrastructure.transcription.audio.TranscriptTextValidator
import com.gonezo.multiplatform.infrastructure.transcription.audio.PcmDecoder
import com.gonezo.multiplatform.infrastructure.transcription.audio.WavPcmDecoder
import com.gonezo.multiplatform.infrastructure.transcription.model.ModelProvider
import com.gonezo.multiplatform.infrastructure.transcription.runtime.AndroidSpeechTranscriber
import com.gonezo.multiplatform.infrastructure.transcription.TranscriptionFailureCodes as SpeechTranscriptionFailureCodes
import dev.solidcoder.speech.AudioSourceRef
import dev.solidcoder.speech.Transcript
import dev.solidcoder.speech.TranscriptSegment
import dev.solidcoder.speech.TranscriptionIssue
import dev.solidcoder.speech.TranscriptionIssueSeverity
import dev.solidcoder.speech.TranscriptionRequest
import dev.solidcoder.speech.TranscriptionResult
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

internal class WhisperCppTranscriber(
  private val sourceResolver: (AudioSourceRef) -> File,
  private val modelProvider: ModelProvider,
  private val pcmDecoder: PcmDecoder = WavPcmDecoder(),
  private val audioPreprocessor: SpeechAudioPreprocessor = EnergyBasedSpeechAudioPreprocessor(),
  private val qualityPolicy: TranscriptQualityPolicy = DefaultTranscriptQualityPolicy(),
  private val textValidator: TranscriptTextValidator = DefaultTranscriptTextValidator(),
  private val nativeBridge: WhisperNativeBridgeApi = WhisperNativeBridge,
  private val threadCount: Int = Runtime.getRuntime().availableProcessors().coerceIn(1, 4),
) : AndroidSpeechTranscriber {
  private val lock = Any()
  private val cancelled = AtomicBoolean(false)
  @Volatile
  private var context: Long = 0L
  private var contextModelPath: String? = null

  override suspend fun transcribe(request: TranscriptionRequest): TranscriptionResult = transcribeBlocking(request)

  override fun transcribeBlocking(request: TranscriptionRequest): TranscriptionResult = synchronized(lock) {
    cancelled.set(false)
    val audioFile = try {
      sourceResolver(request.audioSource)
    } catch (exception: Exception) {
      return@synchronized failure(SpeechTranscriptionFailureCodes.AUDIO_NOT_FOUND, exception.message ?: "Audio source was not found.", false)
    }

    val pcm = try {
      pcmDecoder.decode(audioFile.readBytes())
    } catch (exception: Exception) {
      return@synchronized failure(SpeechTranscriptionFailureCodes.INVALID_AUDIO, exception.message ?: "Audio source is not a supported WAV file.", false)
    }
    if (cancelled.get()) return@synchronized failure(SpeechTranscriptionFailureCodes.TRANSCRIPTION_CANCELLED, "Speech transcription was cancelled.", true)

    when (val preparation = audioPreprocessor.prepare(pcm)) {
      SpeechAudioPreparation.NoSpeech -> return@synchronized failure(
        SpeechTranscriptionFailureCodes.NO_SPEECH_DETECTED,
        "No speech was detected in the recording.",
        true,
      )
      is SpeechAudioPreparation.Ready -> {
        val modelPath = try {
          modelProvider.modelPath()
        } catch (exception: RuntimeException) {
          val code = if (exception.message?.contains("integrity", ignoreCase = true) == true) {
            SpeechTranscriptionFailureCodes.MODEL_CORRUPT
          } else {
            SpeechTranscriptionFailureCodes.MODEL_UNAVAILABLE
          }
          return@synchronized failure(code, exception.message ?: "Speech model is unavailable.", true)
        }

        try {
          ensureContext(modelPath)
          val requestedLanguage = request.language?.trim().orEmpty()
          val effectiveLanguage = if (request.detectLanguageAutomatically) {
            "auto"
          } else {
            if (requestedLanguage.isBlank()) {
              return@synchronized failure(
                SpeechTranscriptionFailureCodes.UNSUPPORTED_TRANSCRIPTION_LANGUAGE,
                "Speech transcription language is not supported.",
                false,
              )
            }
            requestedLanguage
          }

          if (!request.detectLanguageAutomatically && nativeBridge.languageId(effectiveLanguage) < 0) {
            return@synchronized failure(
              SpeechTranscriptionFailureCodes.UNSUPPORTED_TRANSCRIPTION_LANGUAGE,
              "Speech transcription language is not supported.",
              false,
            )
          }

          if (requiresMultilingualModel(request, effectiveLanguage) && !nativeBridge.isMultilingual(context)) {
            return@synchronized failure(
              SpeechTranscriptionFailureCodes.UNSUPPORTED_TRANSCRIPTION_LANGUAGE,
              "The loaded speech model does not support this transcription language.",
              false,
            )
          }

          val nativePayload = try {
            parseWhisperNativeTranscriptionPayload(
              nativeBridge.transcribe(
                context,
                threadCount,
                effectiveLanguage,
                request.detectLanguageAutomatically,
                preparation.samples,
              ),
            )
          } catch (exception: IllegalArgumentException) {
            return@synchronized failure(
              SpeechTranscriptionFailureCodes.TRANSCRIPTION_INVALID_OUTPUT,
              exception.message ?: "Speech transcription returned invalid output.",
              true,
            )
          }

          if (cancelled.get()) return@synchronized failure(SpeechTranscriptionFailureCodes.TRANSCRIPTION_CANCELLED, "Speech transcription was cancelled.", true)

          when (nativePayload) {
            is WhisperNativeTranscriptionPayload.Failure -> {
              return@synchronized failure(
                nativePayload.code,
                nativePayload.message,
                nativePayload.recoverable,
                nativePayload.retryable,
              )
            }
            is WhisperNativeTranscriptionPayload.Success -> {
              val recognizedSegments = nativePayload.segments.map {
                RecognizedSpeechSegment(
                  text = it.text,
                  startMs = it.startMs,
                  endMs = it.endMs,
                  noSpeechProbability = it.noSpeechProbability,
                )
              }

              when (val quality = qualityPolicy.evaluate(recognizedSegments)) {
                TranscriptQualityResult.NoSpeechDetected -> {
                  return@synchronized failure(
                    SpeechTranscriptionFailureCodes.NO_SPEECH_DETECTED,
                    "No speech was detected in the transcription.",
                    true,
                  )
                }
                is TranscriptQualityResult.Ready -> {
                  when (val validation = textValidator.validate(quality.text)) {
                    is TranscriptTextValidation.Invalid -> {
                      return@synchronized failure(
                        SpeechTranscriptionFailureCodes.TRANSCRIPTION_INVALID_OUTPUT,
                        validation.reason,
                        true,
                      )
                    }
                    is TranscriptTextValidation.Valid -> {
                      val transcriptSegments = quality.segments.map {
                        TranscriptSegment(
                          text = it.text,
                          startMs = it.startMs,
                          endMs = it.endMs,
                          noSpeechProbability = it.noSpeechProbability,
                        )
                      }
                      return@synchronized TranscriptionResult.success(
                        Transcript(
                          validation.normalizedText,
                          transcriptSegments,
                        ),
                      )
                    }
                  }
                }
              }
            }
          }
        } catch (exception: UnsatisfiedLinkError) {
          return@synchronized failure(
            SpeechTranscriptionFailureCodes.NATIVE_TRANSCRIPTION_FAILED,
            "Local speech transcription is not available in this build.",
            false,
          )
        } catch (exception: RuntimeException) {
          return@synchronized failure(
            SpeechTranscriptionFailureCodes.NATIVE_TRANSCRIPTION_FAILED,
            exception.message ?: "Local speech transcription failed.",
            true,
          )
        }
      }
    }
  }

  override fun cancelBlocking() {
    cancelled.set(true)
    val activeContext = context
    if (activeContext != 0L) {
      try {
        nativeBridge.cancel(activeContext)
      } catch (_: UnsatisfiedLinkError) {
      }
    }
  }

  override fun close() = synchronized(lock) {
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

  private fun requiresMultilingualModel(request: TranscriptionRequest, language: String): Boolean {
    if (request.detectLanguageAutomatically) {
      return true
    }
    return language != "en"
  }

  private fun failure(
    code: String,
    message: String,
    recoverable: Boolean,
    retryable: Boolean = recoverable,
  ): TranscriptionResult = TranscriptionResult.failure(
    TranscriptionIssue(
      code,
      message,
      if (recoverable) TranscriptionIssueSeverity.RECOVERABLE else TranscriptionIssueSeverity.DEFINITIVE,
      recoverable,
      retryable,
    ),
  )
}
