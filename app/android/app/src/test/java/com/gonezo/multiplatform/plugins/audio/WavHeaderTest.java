package com.gonezo.multiplatform.plugins.audio;

import static org.junit.Assert.assertEquals;

import java.io.File;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import org.junit.Test;

public class WavHeaderTest {
  @Test
  public void writesWhisperCompatiblePcmHeader() throws Exception {
    File file = Files.createTempFile("gonezo-wav", ".wav").toFile();

    WavHeader.write(file, 3_200L);

    try (RandomAccessFile input = new RandomAccessFile(file, "r")) {
      byte[] header = new byte[44];
      input.readFully(header);
      assertEquals("RIFF", new String(header, 0, 4));
      assertEquals("WAVE", new String(header, 8, 4));
      assertEquals(16_000, littleEndianInt(header, 24));
      assertEquals(1, littleEndianShort(header, 22));
      assertEquals(16, littleEndianShort(header, 34));
      assertEquals(3_200, littleEndianInt(header, 40));
    }
  }

  private static int littleEndianInt(byte[] bytes, int offset) {
    return (bytes[offset] & 0xFF)
      | ((bytes[offset + 1] & 0xFF) << 8)
      | ((bytes[offset + 2] & 0xFF) << 16)
      | ((bytes[offset + 3] & 0xFF) << 24);
  }

  private static int littleEndianShort(byte[] bytes, int offset) {
    return (bytes[offset] & 0xFF) | ((bytes[offset + 1] & 0xFF) << 8);
  }
}
