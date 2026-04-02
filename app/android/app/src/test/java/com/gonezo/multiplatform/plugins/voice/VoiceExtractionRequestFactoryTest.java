package com.gonezo.multiplatform.plugins.voice;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import com.gonezo.audioextraction.ui.dto.ExtractionRequestDto;
import java.util.Map;
import org.junit.Test;

public class VoiceExtractionRequestFactoryTest {
  private static final Map<String, Object> OUTPUT_SCHEMA = Map.of(
    "type", "object",
    "required", java.util.List.of("type"),
    "properties", Map.of(
      "type", Map.of("type", "string")
    )
  );

  @Test
  public void build_sets_source_type_to_url() {
    VoiceExtractionRequestFactory factory = new VoiceExtractionRequestFactory();

    ExtractionRequestDto request = factory.build(
      "http://127.0.0.1:4000/storage/voice-recordings/a.m4a?exp=1&sig=x",
      OUTPUT_SCHEMA,
      "account-1",
      "expense",
      "coffee"
    );

    assertEquals("v1", request.getSchemaVersion());
    assertEquals("url", request.getSource().getType());
    assertTrue(request.getSource().getValue().startsWith("http://127.0.0.1"));
    assertEquals("account-1", request.getContext().get("accountId"));
    assertEquals("expense", request.getContext().get("expectedType"));
  }

  @Test
  public void build_rejects_non_https_non_loopback_http_url() {
    VoiceExtractionRequestFactory factory = new VoiceExtractionRequestFactory();

    assertThrows(
      IllegalArgumentException.class,
      () -> factory.build(
        "http://evil.example.com/audio.m4a",
        OUTPUT_SCHEMA,
        "account-1",
        "expense",
        "coffee"
      )
    );
  }

  @Test
  public void build_accepts_https_url() {
    VoiceExtractionRequestFactory factory = new VoiceExtractionRequestFactory();

    ExtractionRequestDto request = factory.build(
      "https://storage.example.com/voice-recordings/a.m4a",
      OUTPUT_SCHEMA,
      "account-1",
      "expense",
      ""
    );

    assertEquals("url", request.getSource().getType());
    assertEquals("https://storage.example.com/voice-recordings/a.m4a", request.getSource().getValue());
  }
}
