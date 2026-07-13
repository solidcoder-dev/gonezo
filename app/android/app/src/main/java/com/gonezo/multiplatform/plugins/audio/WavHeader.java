package com.gonezo.multiplatform.plugins.audio;

import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;

final class WavHeader {
  private WavHeader() {
  }

  static void write(File file, long pcmBytes) throws IOException {
    long totalDataLength = pcmBytes + 36L;
    long byteRate = (long) AudioCaptureConfiguration.SAMPLE_RATE
      * AudioCaptureConfiguration.CHANNEL_COUNT
      * AudioCaptureConfiguration.BITS_PER_SAMPLE / 8L;

    byte[] header = new byte[44];
    header[0] = 'R';
    header[1] = 'I';
    header[2] = 'F';
    header[3] = 'F';
    writeIntLE(header, 4, (int) totalDataLength);
    header[8] = 'W';
    header[9] = 'A';
    header[10] = 'V';
    header[11] = 'E';
    header[12] = 'f';
    header[13] = 'm';
    header[14] = 't';
    header[15] = ' ';
    writeIntLE(header, 16, 16);
    writeShortLE(header, 20, (short) 1);
    writeShortLE(header, 22, (short) AudioCaptureConfiguration.CHANNEL_COUNT);
    writeIntLE(header, 24, AudioCaptureConfiguration.SAMPLE_RATE);
    writeIntLE(header, 28, (int) byteRate);
    writeShortLE(header, 32, (short) (AudioCaptureConfiguration.CHANNEL_COUNT * AudioCaptureConfiguration.BITS_PER_SAMPLE / 8));
    writeShortLE(header, 34, (short) AudioCaptureConfiguration.BITS_PER_SAMPLE);
    header[36] = 'd';
    header[37] = 'a';
    header[38] = 't';
    header[39] = 'a';
    writeIntLE(header, 40, (int) pcmBytes);

    try (RandomAccessFile output = new RandomAccessFile(file, "rw")) {
      output.seek(0L);
      output.write(header);
    }
  }

  private static void writeIntLE(byte[] target, int offset, int value) {
    target[offset] = (byte) (value & 0xFF);
    target[offset + 1] = (byte) ((value >> 8) & 0xFF);
    target[offset + 2] = (byte) ((value >> 16) & 0xFF);
    target[offset + 3] = (byte) ((value >> 24) & 0xFF);
  }

  private static void writeShortLE(byte[] target, int offset, short value) {
    target[offset] = (byte) (value & 0xFF);
    target[offset + 1] = (byte) ((value >> 8) & 0xFF);
  }
}
