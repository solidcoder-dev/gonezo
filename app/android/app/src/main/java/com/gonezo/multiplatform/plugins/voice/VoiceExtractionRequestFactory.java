package com.gonezo.multiplatform.plugins.voice;

import com.gonezo.audioextraction.ui.dto.ExtractionRequestDto;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

public final class VoiceExtractionRequestFactory implements VoiceExtractionRequestBuilder {
  private static final String INSTRUCTIONS = "Extract transaction fields from audio transcript.";

  @Override
  public ExtractionRequestDto build(
    String sourceUrl,
    Map<String, Object> outputSchema,
    String accountId,
    String expectedType,
    String transcriptHint
  ) {
    String normalizedSourceUrl = requireValidVoiceSourceUrl(sourceUrl);
    String normalizedAccountId = requireNonBlank(accountId, "accountId is required");
    String normalizedExpectedType = requireNonBlank(expectedType, "expectedType is required");
    if (outputSchema == null || outputSchema.isEmpty()) {
      throw new IllegalArgumentException("outputSchema is required");
    }

    Map<String, Object> context = new LinkedHashMap<>();
    context.put("accountId", normalizedAccountId);
    context.put("expectedType", normalizedExpectedType);
    context.put("transcriptHint", transcriptHint == null ? "" : transcriptHint);

    return new ExtractionRequestDto(
      "v1",
      new ExtractionRequestDto.SourceDto("url", normalizedSourceUrl),
      new ExtractionRequestDto.ExtractionDto(outputSchema, INSTRUCTIONS),
      context,
      new ExtractionRequestDto.OptionsDto(true, null)
    );
  }

  private String requireValidVoiceSourceUrl(String sourceUrl) {
    String normalizedUrl = requireNonBlank(sourceUrl, "sourceUrl is required");
    URI uri;
    try {
      uri = new URI(normalizedUrl);
    } catch (URISyntaxException ex) {
      throw new IllegalArgumentException("sourceUrl must be a valid URL", ex);
    }

    if (!uri.isAbsolute() || uri.getScheme() == null || uri.getHost() == null) {
      throw new IllegalArgumentException("sourceUrl must be an absolute URL");
    }
    if (uri.getUserInfo() != null) {
      throw new IllegalArgumentException("sourceUrl must not contain user info");
    }

    String scheme = uri.getScheme().toLowerCase(Locale.ROOT);
    if ("https".equals(scheme)) {
      return normalizedUrl;
    }
    if ("http".equals(scheme) && isLoopbackHost(uri.getHost())) {
      return normalizedUrl;
    }
    throw new IllegalArgumentException("sourceUrl must be https or loopback http");
  }

  private boolean isLoopbackHost(String host) {
    String normalizedHost = host.toLowerCase(Locale.ROOT);
    return normalizedHost.equals("localhost")
      || normalizedHost.equals("::1")
      || normalizedHost.equals("0:0:0:0:0:0:0:1")
      || normalizedHost.startsWith("127.");
  }

  private String requireNonBlank(String value, String message) {
    if (value == null || value.trim().isEmpty()) {
      throw new IllegalArgumentException(message);
    }
    return value.trim();
  }
}
