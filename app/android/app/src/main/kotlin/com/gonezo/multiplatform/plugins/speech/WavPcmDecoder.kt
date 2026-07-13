package com.gonezo.multiplatform.plugins.speech

import java.nio.ByteBuffer
import java.nio.ByteOrder

class WavPcmDecoder : PcmDecoder {
  override fun decode(wavBytes: ByteArray): PcmAudio {
    require(wavBytes.size >= 44) { "WAV payload is too small" }
    val buffer = ByteBuffer.wrap(wavBytes).order(ByteOrder.LITTLE_ENDIAN)
    require(ascii(buffer, 0, 4) == "RIFF" && ascii(buffer, 8, 4) == "WAVE") { "unsupported WAV container" }

    var cursor = 12
    var format = 0
    var channels = 0
    var sampleRate = 0
    var bitsPerSample = 0
    var dataOffset = -1
    var dataSize = 0
    while (cursor + 8 <= wavBytes.size) {
      val chunkSize = buffer.getInt(cursor + 4)
      require(chunkSize >= 0 && cursor + 8L + chunkSize <= wavBytes.size) { "invalid WAV chunk length" }
      val dataStart = cursor + 8
      when (ascii(buffer, cursor, 4)) {
        "fmt " -> {
          require(chunkSize >= 16) { "invalid WAV format chunk" }
          format = buffer.getShort(dataStart).toInt() and 0xffff
          channels = buffer.getShort(dataStart + 2).toInt() and 0xffff
          sampleRate = buffer.getInt(dataStart + 4)
          bitsPerSample = buffer.getShort(dataStart + 14).toInt() and 0xffff
        }
        "data" -> {
          dataOffset = dataStart
          dataSize = chunkSize
          break
        }
      }
      cursor = dataStart + chunkSize + (chunkSize and 1)
    }

    require(format == 1 && channels == 1 && sampleRate == 16_000 && bitsPerSample == 16) {
      "audio must be PCM 16-bit mono at 16 kHz"
    }
    require(dataOffset >= 0 && dataSize > 0) { "WAV data chunk is missing" }
    val samples = FloatArray(dataSize / 2)
    for (index in samples.indices) {
      samples[index] = (buffer.getShort(dataOffset + index * 2).toInt() / 32768.0f).coerceIn(-1.0f, 1.0f)
    }
    require(samples.isNotEmpty()) { "WAV audio is empty" }
    return PcmAudio(samples, sampleRate)
  }

  private fun ascii(buffer: ByteBuffer, offset: Int, length: Int): String {
    val bytes = ByteArray(length)
    for (index in 0 until length) bytes[index] = buffer.get(offset + index)
    return bytes.toString(Charsets.US_ASCII)
  }
}
