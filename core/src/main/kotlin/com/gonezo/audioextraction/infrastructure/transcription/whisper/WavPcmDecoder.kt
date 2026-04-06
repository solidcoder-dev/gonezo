package com.gonezo.audioextraction.infrastructure.transcription.whisper

import com.gonezo.audioextraction.domain.model.SourceAudio
import java.nio.ByteBuffer
import java.nio.ByteOrder

class WavPcmDecoder : PcmDecoder {
  override fun decode(audio: SourceAudio): PcmAudio {
    if (audio.bytes.size < HEADER_SIZE) {
      throw IllegalArgumentException("WAV payload too small")
    }

    val buffer = ByteBuffer.wrap(audio.bytes).order(ByteOrder.LITTLE_ENDIAN)
    val riff = readAscii(buffer, 0, 4)
    val wave = readAscii(buffer, 8, 4)
    if (riff != "RIFF" || wave != "WAVE") {
      throw IllegalArgumentException("Unsupported WAV container")
    }

    var cursor = 12
    var format = 0
    var channels = 0
    var sampleRate = 0
    var bitsPerSample = 0
    var dataOffset = -1
    var dataSize = 0

    while (cursor + 8 <= audio.bytes.size) {
      val chunkId = readAscii(buffer, cursor, 4)
      val chunkSize = buffer.getInt(cursor + 4)
      val chunkDataStart = cursor + 8

      if (chunkSize < 0 || chunkDataStart + chunkSize > audio.bytes.size) {
        throw IllegalArgumentException("Invalid WAV chunk length")
      }

      when (chunkId) {
        "fmt " -> {
          if (chunkSize < 16) {
            throw IllegalArgumentException("Invalid fmt chunk")
          }
          format = buffer.getShort(chunkDataStart).toInt() and 0xFFFF
          channels = buffer.getShort(chunkDataStart + 2).toInt() and 0xFFFF
          sampleRate = buffer.getInt(chunkDataStart + 4)
          bitsPerSample = buffer.getShort(chunkDataStart + 14).toInt() and 0xFFFF
        }

        "data" -> {
          dataOffset = chunkDataStart
          dataSize = chunkSize
          break
        }
      }

      cursor = chunkDataStart + chunkSize + (chunkSize and 1)
    }

    if (format != 1) {
      throw IllegalArgumentException("Only PCM WAV format is supported")
    }
    if (channels <= 0 || channels > 2) {
      throw IllegalArgumentException("Unsupported WAV channel count")
    }
    if (sampleRate <= 0) {
      throw IllegalArgumentException("Invalid WAV sample rate")
    }
    if (bitsPerSample != 16) {
      throw IllegalArgumentException("Only 16-bit WAV PCM is supported")
    }
    if (dataOffset < 0 || dataSize <= 0) {
      throw IllegalArgumentException("WAV data chunk is missing")
    }

    val bytesPerFrame = channels * 2
    val frameCount = dataSize / bytesPerFrame
    if (frameCount <= 0) {
      return PcmAudio(FloatArray(0), sampleRate)
    }

    val pcm = FloatArray(frameCount)
    var frame = 0
    var cursorData = dataOffset
    while (frame < frameCount && cursorData + bytesPerFrame <= dataOffset + dataSize) {
      val left = buffer.getShort(cursorData).toInt()
      val mono = if (channels == 1) {
        left
      } else {
        val right = buffer.getShort(cursorData + 2).toInt()
        (left + right) / 2
      }
      pcm[frame] = (mono / 32768.0f).coerceIn(-1.0f, 1.0f)
      frame += 1
      cursorData += bytesPerFrame
    }

    return PcmAudio(pcm, sampleRate)
  }

  private fun readAscii(buffer: ByteBuffer, offset: Int, length: Int): String {
    val bytes = ByteArray(length)
    for (index in 0 until length) {
      bytes[index] = buffer.get(offset + index)
    }
    return bytes.toString(Charsets.US_ASCII)
  }

  companion object {
    private const val HEADER_SIZE = 44
  }
}
