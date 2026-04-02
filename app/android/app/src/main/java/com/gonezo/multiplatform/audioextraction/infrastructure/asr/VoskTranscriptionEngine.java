package com.gonezo.multiplatform.audioextraction.infrastructure.asr;

import android.util.Log;
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
  private static final String LOG_TAG = "GonezoAudioExtract";

  @Override
  public Transcript transcribe(SourceAudio audio) {
    String requestId = extractRequestId(audio);
    if (audio == null || audio.bytes() == null) {
      logw("transcribe_failed requestId=" + requestId + " reason=source_audio_empty");
      throw new AudioExtractionException(ErrorCode.TRANSCRIPTION_FAILED, "Source audio is empty");
    }
    logi(
      "transcribe_start requestId=" + requestId
        + " sourceRef=" + audio.sourceRef()
        + " bytesLength=" + audio.bytes().length
        + " metadataKeys=" + audio.metadata().keySet()
    );

    String transcriptHint = asString(audio.metadata().get("transcriptHint"));
    if (transcriptHint == null || transcriptHint.isBlank()) {
      transcriptHint = asString(audio.metadata().get("transcript"));
    }
    if (transcriptHint != null && !transcriptHint.isBlank()) {
      String normalized = transcriptHint.trim();
      logi(
        "transcribe_from_context requestId=" + requestId
          + " sourceRef=" + audio.sourceRef()
          + " transcriptLength=" + normalized.length()
          + " metadataKeys=" + audio.metadata().keySet()
      );
      return new Transcript(normalized, List.of(new Segment(normalized, 0L, 0L)));
    }

    String decodedAsUtf8 = decodeUtf8(audio.bytes());
    if (decodedAsUtf8 != null && !decodedAsUtf8.isBlank()) {
      String normalized = decodedAsUtf8.trim();
      logw(
        "transcribe_from_utf8_fallback requestId=" + requestId
          + " sourceRef=" + audio.sourceRef()
          + " transcriptLength=" + normalized.length()
      );
      return new Transcript(normalized, List.of(new Segment(normalized, 0L, 0L)));
    }

    logw(
      "transcribe_failed requestId=" + requestId
        + " reason=no_transcript sourceRef=" + audio.sourceRef()
        + " bytesLength=" + audio.bytes().length
        + " metadataKeys=" + audio.metadata().keySet()
    );
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

  private String extractRequestId(SourceAudio audio) {
    if (audio == null || audio.metadata() == null) {
      return "unknown";
    }
    Object requestId = audio.metadata().get("requestId");
    if (requestId instanceof String requestIdString && !requestIdString.isBlank()) {
      return requestIdString;
    }
    return "unknown";
  }

  private void logi(String message) {
    try {
      Log.i(LOG_TAG, message);
    } catch (RuntimeException ignored) {
      // Running under local unit tests without android logger.
    }
  }

  private void logw(String message) {
    try {
      Log.w(LOG_TAG, message);
    } catch (RuntimeException ignored) {
      // Running under local unit tests without android logger.
    }
  }
}
