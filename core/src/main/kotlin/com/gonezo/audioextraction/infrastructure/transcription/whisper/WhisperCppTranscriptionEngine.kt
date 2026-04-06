package com.gonezo.audioextraction.infrastructure.transcription.whisper

import com.gonezo.audioextraction.application.pipeline.TranscriptionEngine
import com.gonezo.audioextraction.domain.error.AudioExtractionException
import com.gonezo.audioextraction.domain.error.ErrorCode
import com.gonezo.audioextraction.domain.model.Segment
import com.gonezo.audioextraction.domain.model.SourceAudio
import com.gonezo.audioextraction.domain.model.Transcript

class WhisperCppTranscriptionEngine(
  private val modelProvider: ModelProvider,
  private val pcmDecoder: PcmDecoder = WavPcmDecoder(),
  private val nativeTranscriber: NativeTranscriber = WhisperCppJniTranscriber(),
  private val languageResolver: (SourceAudio) -> String? = { source ->
    source.metadata["language"]?.toString()?.trim()?.takeIf { it.isNotEmpty() }
  },
) : TranscriptionEngine {
  constructor(
    modelProvider: ModelProvider,
    pcmDecoder: PcmDecoder,
    nativeTranscriber: NativeTranscriber,
  ) : this(
    modelProvider = modelProvider,
    pcmDecoder = pcmDecoder,
    nativeTranscriber = nativeTranscriber,
    languageResolver = { source -> source.metadata["language"]?.toString()?.trim()?.takeIf { it.isNotEmpty() } },
  )

  override fun transcribe(audio: SourceAudio): Transcript {
    if (audio.bytes.isEmpty()) {
      throw AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Audio source is empty", null)
    }

    val pcm = try {
      pcmDecoder.decode(audio)
    } catch (ex: RuntimeException) {
      throw AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Cannot decode source audio", ex)
    }

    if (pcm.samples.isEmpty()) {
      throw AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Decoded audio is empty", null)
    }

    val normalized = if (pcm.sampleRate == TARGET_SAMPLE_RATE) {
      pcm
    } else {
      PcmAudio(resampleTo16Khz(pcm.samples, pcm.sampleRate), TARGET_SAMPLE_RATE)
    }

    if (normalized.samples.isEmpty()) {
      throw AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Resampled audio is empty", null)
    }

    val modelPath = modelProvider.modelPath()
    if (modelPath.isBlank()) {
      throw AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Whisper model path is missing", null)
    }

    val transcript = try {
      nativeTranscriber.transcribe(modelPath, normalized, languageResolver(audio))
    } catch (ex: RuntimeException) {
      throw AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Whisper recognition failed", ex)
    }

    if (transcript.isBlank()) {
      throw AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Whisper transcription produced empty transcript", null)
    }

    return Transcript(
      text = transcript,
      segments = listOf(Segment(text = transcript, startMs = 0L, endMs = 0L)),
    )
  }

  private fun resampleTo16Khz(input: FloatArray, sourceRate: Int): FloatArray {
    if (input.isEmpty() || sourceRate <= 0 || sourceRate == TARGET_SAMPLE_RATE) {
      return input
    }

    val outputSize = ((input.size.toLong() * TARGET_SAMPLE_RATE) / sourceRate).toInt().coerceAtLeast(1)
    val output = FloatArray(outputSize)
    for (index in 0 until outputSize) {
      val sourcePosition = index.toDouble() * sourceRate / TARGET_SAMPLE_RATE
      val leftIndex = sourcePosition.toInt().coerceIn(0, input.lastIndex)
      val rightIndex = (leftIndex + 1).coerceAtMost(input.lastIndex)
      val alpha = (sourcePosition - leftIndex)
      output[index] = ((1.0 - alpha) * input[leftIndex] + alpha * input[rightIndex]).toFloat()
    }
    return output
  }

  companion object {
    private const val TARGET_SAMPLE_RATE = 16_000
  }
}
