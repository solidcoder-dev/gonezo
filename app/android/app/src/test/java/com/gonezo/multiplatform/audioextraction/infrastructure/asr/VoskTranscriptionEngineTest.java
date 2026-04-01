package com.gonezo.multiplatform.audioextraction.infrastructure.asr;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.fail;

import com.gonezo.multiplatform.audioextraction.domain.error.AudioExtractionException;
import com.gonezo.multiplatform.audioextraction.domain.error.ErrorCode;
import com.gonezo.multiplatform.audioextraction.domain.model.SourceAudio;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.Test;

public class VoskTranscriptionEngineTest {

  @Test
  public void usesTranscriptHintWhenProvided() {
    VoskTranscriptionEngine engine = new VoskTranscriptionEngine();
    SourceAudio audio = new SourceAudio(
      new byte[] {1, 2, 3},
      "audio/mp4",
      "storage://voice-recordings/rec-1.m4a",
      Map.of("transcriptHint", "expense groceries 15.25")
    );

    Transcript transcript = engine.transcribe(audio);

    assertEquals("expense groceries 15.25", transcript.text());
    assertEquals(1, transcript.segments().size());
  }

  @Test
  public void fallsBackToUtf8DecodingWhenHintIsMissing() {
    VoskTranscriptionEngine engine = new VoskTranscriptionEngine();
    SourceAudio audio = new SourceAudio(
      "income salary 999.9".getBytes(StandardCharsets.UTF_8),
      "audio/wav",
      "inline",
      Map.of()
    );

    Transcript transcript = engine.transcribe(audio);

    assertEquals("income salary 999.9", transcript.text());
  }

  @Test
  public void throwsWhenCannotProduceTranscript() {
    VoskTranscriptionEngine engine = new VoskTranscriptionEngine();
    SourceAudio audio = new SourceAudio(
      new byte[] {(byte) 0x80, (byte) 0x81, (byte) 0x82},
      "audio/mp4",
      "inline",
      Map.of()
    );

    try {
      engine.transcribe(audio);
      fail("Expected transcription failure");
    } catch (AudioExtractionException ex) {
      assertEquals(ErrorCode.TRANSCRIPTION_FAILED, ex.code());
    }
  }
}

