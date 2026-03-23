package com.gonezo.multiplatform.plugins;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;

final class MobillsImportFingerprint {

  private MobillsImportFingerprint() {
    throw new IllegalStateException("Utility class");
  }

  static String fromRow(
    String accountName,
    String occurredAt,
    BigDecimal signedValue,
    String currency,
    String description,
    String merchant
  ) {
    String canonical = String.join(
      "|",
      "mobills",
      normalizeLower(accountName),
      normalizeRaw(occurredAt),
      normalizeAmount(signedValue),
      normalizeUpper(currency),
      normalizeLower(description),
      normalizeLower(merchant)
    );
    return sha256Hex(canonical);
  }

  private static String normalizeLower(String value) {
    if (value == null) {
      return "";
    }
    return value.trim().toLowerCase(Locale.ROOT);
  }

  private static String normalizeUpper(String value) {
    if (value == null) {
      return "";
    }
    return value.trim().toUpperCase(Locale.ROOT);
  }

  private static String normalizeRaw(String value) {
    if (value == null) {
      return "";
    }
    return value.trim();
  }

  private static String normalizeAmount(BigDecimal value) {
    if (value == null) {
      return "";
    }
    return value.stripTrailingZeros().toPlainString();
  }

  private static String sha256Hex(String input) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
      StringBuilder hex = new StringBuilder(hash.length * 2);
      for (byte item : hash) {
        hex.append(String.format(Locale.ROOT, "%02x", item));
      }
      return hex.toString();
    } catch (NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 algorithm is not available", ex);
    }
  }
}
