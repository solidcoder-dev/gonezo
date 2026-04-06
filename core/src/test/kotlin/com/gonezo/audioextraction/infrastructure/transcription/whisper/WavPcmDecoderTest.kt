package com.gonezo.audioextraction.infrastructure.transcription.whisper

import com.gonezo.audioextraction.domain.model.SourceAudio
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder

class WavPcmDecoderTest {
  @Test
  fun `decode should parse mono 16-bit pcm wave`() {
    val bytes = waveBytes(sampleRate = 16_000, channels = 1, samples = shortArrayOf(0, 16384, -16384))

    val decoded = WavPcmDecoder().decode(SourceAudio(bytes = bytes, mimeType = "audio/wav", sourceRef = "fixture"))

    assertThat(decoded.sampleRate).isEqualTo(16_000)
    assertThat(decoded.samples).hasSize(3)
    assertThat(decoded.samples[0]).isEqualTo(0.0f)
    assertThat(decoded.samples[1]).isBetween(0.49f, 0.51f)
    assertThat(decoded.samples[2]).isBetween(-0.51f, -0.49f)
  }

  private fun waveBytes(sampleRate: Int, channels: Int, samples: ShortArray): ByteArray {
    val bytesPerSample = 2
    val dataSize = samples.size * bytesPerSample
    val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
    header.put("RIFF".toByteArray(Charsets.US_ASCII))
    header.putInt(36 + dataSize)
    header.put("WAVE".toByteArray(Charsets.US_ASCII))
    header.put("fmt ".toByteArray(Charsets.US_ASCII))
    header.putInt(16)
    header.putShort(1)
    header.putShort(channels.toShort())
    header.putInt(sampleRate)
    header.putInt(sampleRate * channels * bytesPerSample)
    header.putShort((channels * bytesPerSample).toShort())
    header.putShort(16)
    header.put("data".toByteArray(Charsets.US_ASCII))
    header.putInt(dataSize)

    val data = ByteBuffer.allocate(dataSize).order(ByteOrder.LITTLE_ENDIAN)
    for (sample in samples) {
      data.putShort(sample)
    }

    return header.array() + data.array()
  }
}
