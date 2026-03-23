package com.gonezo.multiplatform.plugins;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;

import java.math.BigDecimal;
import org.junit.Test;

public class MobillsImportFingerprintTest {

  @Test
  public void createsStableFingerprintForEquivalentRows() {
    String first = MobillsImportFingerprint.fromRow(
      "Billetera",
      "2018-07-31T12:00:00Z",
      new BigDecimal("-8.30"),
      "eur",
      "Pollo y papas",
      ""
    );
    String second = MobillsImportFingerprint.fromRow(
      "  billetera  ",
      "2018-07-31T12:00:00Z",
      new BigDecimal("-8.300"),
      "EUR",
      "  pollo y papas  ",
      null
    );

    assertEquals(first, second);
  }

  @Test
  public void changesFingerprintWhenTransactionIdentityChanges() {
    String base = MobillsImportFingerprint.fromRow(
      "Billetera",
      "2018-07-31T12:00:00Z",
      new BigDecimal("-8.30"),
      "EUR",
      "Pollo y papas",
      ""
    );
    String differentAmount = MobillsImportFingerprint.fromRow(
      "Billetera",
      "2018-07-31T12:00:00Z",
      new BigDecimal("-8.31"),
      "EUR",
      "Pollo y papas",
      ""
    );

    assertNotEquals(base, differentAmount);
  }
}
