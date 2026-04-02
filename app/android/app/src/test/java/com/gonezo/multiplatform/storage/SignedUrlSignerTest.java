package com.gonezo.multiplatform.storage;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.nio.charset.StandardCharsets;
import org.junit.Test;

public class SignedUrlSignerTest {
  @Test
  public void verify_accepts_valid_signature() {
    SignedUrlSigner signer = new SignedUrlSigner("secret".getBytes(StandardCharsets.UTF_8));
    String signature = signer.sign("GET", "/storage/voice-recordings/a.m4a", 1_700_000_000L);

    assertTrue(signer.verify("GET", "/storage/voice-recordings/a.m4a", 1_700_000_000L, signature));
  }

  @Test
  public void verify_rejects_invalid_signature() {
    SignedUrlSigner signer = new SignedUrlSigner("secret".getBytes(StandardCharsets.UTF_8));
    String signature = signer.sign("GET", "/storage/voice-recordings/a.m4a", 1_700_000_000L);

    assertFalse(signer.verify("GET", "/storage/voice-recordings/a.m4a", 1_700_000_001L, signature));
  }
}
