package com.gonezo.multiplatform.audioextraction.infrastructure.asr;

import com.gonezo.multiplatform.audioextraction.application.TranscriptionEngine;
import com.gonezo.multiplatform.audioextraction.domain.error.AudioExtractionException;
import com.gonezo.multiplatform.audioextraction.domain.error.ErrorCode;
import com.gonezo.multiplatform.audioextraction.domain.model.Segment;
import com.gonezo.multiplatform.audioextraction.domain.model.SourceAudio;
import com.gonezo.multiplatform.audioextraction.domain.model.Transcript;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

public final class VoskTranscriptionEngine implements TranscriptionEngine {
  @Override
  public Transcript transcribe(SourceAudio audio) {
    if (audio == null || audio.bytes() == null) {
      throw new AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Source audio is empty");
    }

    String transcriptHint = asString(audio.metadata().get("transcriptHint"));
    if (transcriptHint != null && !transcriptHint.isBlank()) {
      String normalized = transcriptHint.trim();
      return new Transcript(normalized, List.of(new Segment(normalized, 0L, 0L)));
    }

    String decodedAsUtf8 = decodeUtf8(audio.bytes());
    if (decodedAsUtf8 != null && !decodedAsUtf8.isBlank()) {
      String normalized = decodedAsUtf8.trim();
      return new Transcript(normalized, List.of(new Segment(normalized, 0L, 0L)));
    }

    throw new AudioExtractionException(
      ErrorCode.TRANSCRIPTION_FAILED,
      "Vosk transcription failed and no transcriptHint was provided"
    );
  }

  private String decodeUtf8(byte[] payload) {
    if (payload.length == 0) {
      return null;
    }

    String text = new String(payload, StandardCharsets.UTF_8).trim();
    if (text.isEmpty()) {
      return null;
    }

    int printable = 0;
    for (char character : text.toCharArray()) {
      if (character == '\n' || character == '\r' || character == '\t' || (character >= 32 && character <= 126)) {
        printable += 1;
      }
    }

    double ratio = text.isEmpty() ? 0D : (double) printable / (double) text.length();
    if (ratio < 0.8D) {
      return null;
    }

    return text;
  }

  private String asString(Object value) {
    if (value instanceof String strValue) {
      return strValue;
    }
    if (value instanceof Map<?, ?> mapValue) {
      Object text = mapValue.get("text");
      return text instanceof String textString ? textString : null;
    }
    return null;
  }
}
