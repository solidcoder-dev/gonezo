package com.gonezo.multiplatform.plugins;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;

public final class AndroidMacroAnalyticsSigningIdentityStore {
  private static final String KEYSTORE = "AndroidKeyStore";
  private static final String ALIAS_PREFIX = "gonezo.macro-analytics.signing.v1.";
  private static final Object KEY_CREATION_LOCK = new Object();

  public Credential getOrCreateCredential(String contributorId) throws Exception {
    requireContributorId(contributorId);
    String alias = aliasFor(contributorId);
    synchronized (KEY_CREATION_LOCK) {
      KeyStore keyStore = loadKeyStore();
      if (!keyStore.containsAlias(alias)) createKeyPair(alias);
    }
    ECPublicKey publicKey = (ECPublicKey) loadKeyStore().getCertificate(alias).getPublicKey();
    byte[] publicKeyDer = publicKey.getEncoded();
    return new Credential(contributorId, base64Url(sha256(publicKeyDer)), base64Url(publicKeyDer));
  }

  public String sign(String contributorId, String payloadBase64Url) throws Exception {
    requireContributorId(contributorId);
    if (payloadBase64Url == null) throw new IllegalArgumentException("Payload is required");
    KeyStore keyStore = loadKeyStore();
    String alias = aliasFor(contributorId);
    if (!keyStore.containsAlias(alias)) throw new IllegalStateException("Signing credential is not registered");
    PrivateKey privateKey = (PrivateKey) keyStore.getKey(alias, null);
    byte[] payload = Base64.decode(payloadBase64Url, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
    Signature signer = Signature.getInstance("SHA256withECDSA");
    signer.initSign(privateKey);
    signer.update(payload);
    return base64Url(signer.sign());
  }

  static String aliasFor(String contributorId) throws Exception {
    requireContributorId(contributorId);
    return ALIAS_PREFIX + base64Url(sha256(contributorId.getBytes(StandardCharsets.UTF_8)));
  }

  private static KeyStore loadKeyStore() throws Exception {
    KeyStore keyStore = KeyStore.getInstance(KEYSTORE);
    keyStore.load(null);
    return keyStore;
  }

  private static void createKeyPair(String alias) throws Exception {
    KeyPairGenerator generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, KEYSTORE);
    generator.initialize(new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_SIGN)
        .setAlgorithmParameterSpec(new ECGenParameterSpec("secp256r1"))
        .setDigests(KeyProperties.DIGEST_SHA256)
        .build());
    generator.generateKeyPair();
  }

  private static void requireContributorId(String contributorId) {
    if (contributorId == null || contributorId.trim().isEmpty()) throw new IllegalArgumentException("Analytics contributor ID is required");
  }

  private static byte[] sha256(byte[] value) throws Exception {
    return MessageDigest.getInstance("SHA-256").digest(value);
  }

  private static String base64Url(byte[] value) {
    return Base64.encodeToString(value, Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
  }

  public static final class Credential {
    public final String contributorId;
    public final String keyId;
    public final String algorithm;
    public final String publicKey;

    private Credential(String contributorId, String keyId, String publicKey) {
      this.contributorId = contributorId;
      this.keyId = keyId;
      this.algorithm = "ECDSA_P256_SHA256";
      this.publicKey = publicKey;
    }
  }
}
