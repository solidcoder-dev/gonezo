package com.gonezo.multiplatform.plugins.speech

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder

class WavPcmDecoderTest {
  @Test
  fun `decodes PCM16 mono 16 kHz samples`() {
    val decoded = WavPcmDecoder().decode(wav(shortArrayOf(0, 16_384, -16_384)))

    assertEquals(16_000, decoded.sampleRate)
    assertEquals(3, decoded.samples.size)
    assertEquals(0.5f, decoded.samples[1], 0.01f)
    assertEquals(-0.5f, decoded.samples[2], 0.01f)
  }

  @Test
  fun `rejects unsupported audio shape`() {
    assertThrows(IllegalArgumentException::class.java) {
      WavPcmDecoder().decode(wav(shortArrayOf(0), sampleRate = 8_000))
    }
  }

  private fun wav(samples: ShortArray, sampleRate: Int = 16_000): ByteArray {
    val dataSize = samples.size * 2
    val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN)
    header.put("RIFF".toByteArray(Charsets.US_ASCII))
    header.putInt(36 + dataSize)
    header.put("WAVEfmt ".toByteArray(Charsets.US_ASCII))
    header.putInt(16)
    header.putShort(1)
    header.putShort(1)
    header.putInt(sampleRate)
    header.putInt(sampleRate * 2)
    header.putShort(2)
    header.putShort(16)
    header.put("data".toByteArray(Charsets.US_ASCII))
    header.putInt(dataSize)
    val data = ByteBuffer.allocate(dataSize).order(ByteOrder.LITTLE_ENDIAN)
    for (sample in samples) data.putShort(sample)
    return header.array() + data.array()
  }
}
