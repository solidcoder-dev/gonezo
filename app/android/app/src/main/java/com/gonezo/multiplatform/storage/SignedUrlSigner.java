package com.gonezo.multiplatform.storage;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

final class SignedUrlSigner {
  private static final String HMAC_ALGORITHM = "HmacSHA256";
  private final byte[] secret;

  SignedUrlSigner(byte[] secret) {
    this.secret = secret.clone();
  }

  String sign(String method, String resourcePath, long expiryEpochSeconds) {
    String canonical = method + "\n" + resourcePath + "\n" + expiryEpochSeconds;
    try {
      Mac mac = Mac.getInstance(HMAC_ALGORITHM);
      mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
      return toHex(mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception ex) {
      throw new IllegalStateException("Cannot sign storage URL", ex);
    }
  }

  boolean verify(String method, String resourcePath, long expiryEpochSeconds, String signatureHex) {
    if (signatureHex == null || signatureHex.isBlank()) {
      return false;
    }
    String expected = sign(method, resourcePath, expiryEpochSeconds);
    return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), signatureHex.getBytes(StandardCharsets.UTF_8));
  }

  private String toHex(byte[] bytes) {
    StringBuilder builder = new StringBuilder(bytes.length * 2);
    for (byte value : bytes) {
      builder.append(String.format("%02x", value));
    }
    return builder.toString();
  }
}
