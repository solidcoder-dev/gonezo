package com.gonezo.multiplatform.audioextraction.infrastructure.source;

import android.content.Context;
import android.util.Log;
import com.gonezo.multiplatform.audioextraction.application.SourceLoader;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionRequest;
import com.gonezo.multiplatform.audioextraction.domain.error.AudioExtractionException;
import com.gonezo.multiplatform.audioextraction.domain.error.ErrorCode;
import com.gonezo.multiplatform.audioextraction.domain.model.SourceAudio;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

public final class AndroidSourceLoader implements SourceLoader {
  private static final String LOG_TAG = "GonezoAudioExtract";
  private final Context context;

  public AndroidSourceLoader(Context context) {
    this.context = context.getApplicationContext();
  }

  @Override
  public SourceAudio load(ExtractionRequest request) {
    if (request == null || request.source() == null) {
      logw("source_load_failed reason=source_required requestId=unknown");
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "source is required");
    }

    String sourceType = request.source().type();
    String sourceValue = request.source().value();
    String requestId = extractRequestId(request.context());
    if (sourceType == null || sourceType.isBlank() || sourceValue == null || sourceValue.isBlank()) {
      logw("source_load_failed reason=source_fields_required requestId=" + requestId);
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "source.type and source.value are required");
    }

    byte[] audioBytes;
    switch (sourceType) {
      case "base64" -> audioBytes = decodeBase64(sourceValue, requestId);
      case "url" -> audioBytes = readFromUrl(sourceValue, requestId);
      case "fileRef" -> audioBytes = readFromFileRef(sourceValue, requestId);
      default -> {
        logw("source_load_failed reason=source_type_unsupported requestId=" + requestId + " sourceType=" + sourceType);
        throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Unsupported source.type: " + sourceType);
      }
    }

    Map<String, Object> metadata = new LinkedHashMap<>(request.context());
    logi(
      "source_loaded requestId=" + requestId
        + " type=" + sourceType
        + " value=" + sourceValue
        + " bytesLength=" + audioBytes.length
        + " metadataKeys=" + metadata.keySet()
    );
    return new SourceAudio(audioBytes, resolveMimeType(sourceValue), sourceValue, metadata);
  }

  private byte[] decodeBase64(String sourceValue, String requestId) {
    try {
      return Base64.getDecoder().decode(sourceValue);
    } catch (IllegalArgumentException ex) {
      logw("source_load_failed reason=base64_invalid requestId=" + requestId);
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "source.value is not valid base64", ex);
    }
  }

  private byte[] readFromUrl(String sourceValue, String requestId) {
    try (InputStream input = new URL(sourceValue).openStream()) {
      return readAll(input);
    } catch (IOException ex) {
      logw("source_load_failed reason=url_read_error requestId=" + requestId + " value=" + sourceValue);
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load url source", ex);
    }
  }

  private byte[] readFromFileRef(String sourceValue, String requestId) {
    File file = resolveFileRef(sourceValue);
    if (!file.exists()) {
      logw("source_load_failed reason=file_not_found requestId=" + requestId + " value=" + sourceValue);
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "fileRef does not exist: " + sourceValue);
    }

    try (InputStream input = new FileInputStream(file)) {
      return readAll(input);
    } catch (IOException ex) {
      logw("source_load_failed reason=file_read_error requestId=" + requestId + " value=" + sourceValue);
      throw new AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot read fileRef source", ex);
    }
  }

  private File resolveFileRef(String sourceValue) {
    if (sourceValue.startsWith("storage://voice-recordings/")) {
      String fileName = sourceValue.substring("storage://voice-recordings/".length());
      File baseDir = new File(context.getFilesDir(), "voice-recordings");
      return new File(baseDir, fileName);
    }

    if (sourceValue.startsWith("file://")) {
      return new File(sourceValue.substring("file://".length()));
    }

    return new File(sourceValue);
  }

  private String resolveMimeType(String sourceValue) {
    String normalized = sourceValue.toLowerCase(java.util.Locale.ROOT);
    if (normalized.endsWith(".m4a") || normalized.endsWith(".aac")) {
      return "audio/mp4";
    }
    if (normalized.endsWith(".wav")) {
      return "audio/wav";
    }
    return "application/octet-stream";
  }

  private byte[] readAll(InputStream input) throws IOException {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    byte[] buffer = new byte[4096];
    int read;
    while ((read = input.read(buffer)) != -1) {
      output.write(buffer, 0, read);
    }
    return output.toByteArray();
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

  private String extractRequestId(Map<String, Object> context) {
    Object requestId = context == null ? null : context.get("requestId");
    if (requestId instanceof String requestIdString && !requestIdString.isBlank()) {
      return requestIdString;
    }
    return "unknown";
  }
}
