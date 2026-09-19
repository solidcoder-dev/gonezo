package com.gonezo.multiplatform.plugins;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.util.Base64;
import android.security.keystore.KeyInfo;
import android.security.keystore.KeyProperties;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyStore;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AndroidMacroAnalyticsSigningIdentityStoreTest {
  private static final String CONTRIBUTOR = "macro-analytics-test-contributor";

  @Test
  public void contributorKeysAreStableIsolatedAndNonExportable() throws Exception {
    AndroidMacroAnalyticsSigningIdentityStore store = new AndroidMacroAnalyticsSigningIdentityStore();
    String secondContributor = CONTRIBUTOR + "-second";
    String firstAlias = AndroidMacroAnalyticsSigningIdentityStore.aliasFor(CONTRIBUTOR);
    String secondAlias = AndroidMacroAnalyticsSigningIdentityStore.aliasFor(secondContributor);
    KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
    keyStore.load(null);
    try {
      AndroidMacroAnalyticsSigningIdentityStore.Credential first = store.getOrCreateCredential(CONTRIBUTOR);
      AndroidMacroAnalyticsSigningIdentityStore.Credential repeated = new AndroidMacroAnalyticsSigningIdentityStore().getOrCreateCredential(CONTRIBUTOR);
      AndroidMacroAnalyticsSigningIdentityStore.Credential second = store.getOrCreateCredential(secondContributor);

      assertEquals(first.keyId, repeated.keyId);
      assertEquals(first.publicKey, repeated.publicKey);
      assertNotEquals(first.keyId, second.keyId);
      assertNotEquals(first.publicKey, second.publicKey);
      assertFalse(firstAlias.contains(CONTRIBUTOR));
      assertTrue(firstAlias.startsWith("gonezo.macro-analytics.signing.v1."));
      assertEquals(Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(Base64.decode(first.publicKey, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING)), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING), first.keyId);
      keyStore.load(null);
      assertNull(keyStore.getKey(firstAlias, null).getEncoded());
      KeyInfo keyInfo = java.security.KeyFactory.getInstance("EC", "AndroidKeyStore").getKeySpec(keyStore.getKey(firstAlias, null), KeyInfo.class);
      assertEquals(KeyProperties.PURPOSE_SIGN, keyInfo.getPurposes());
      assertEquals("ECDSA_P256_SHA256", first.algorithm);

      byte[] payload = "publication-wire-bytes".getBytes(StandardCharsets.UTF_8);
      String encodedPayload = Base64.encodeToString(payload, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
      byte[] signatureBytes = Base64.decode(store.sign(CONTRIBUTOR, encodedPayload), Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
      byte[] publicKeyBytes = Base64.decode(first.publicKey, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
      Signature verifier = Signature.getInstance("SHA256withECDSA");
      verifier.initVerify(KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(publicKeyBytes)));
      verifier.update(payload);
      assertTrue(verifier.verify(signatureBytes));
    } finally {
      keyStore.deleteEntry(firstAlias);
      keyStore.deleteEntry(secondAlias);
    }
  }
}
