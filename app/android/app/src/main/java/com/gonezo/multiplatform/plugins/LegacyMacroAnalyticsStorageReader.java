package com.gonezo.multiplatform.plugins;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

final class LegacyMacroAnalyticsStorageReader {
  private static final String STORE = "gonezo.macro-analytics.local.v1";
  private static final String KEY_ALIAS = "gonezo.macro-analytics.local.key.v1";
  private final Context context;

  LegacyMacroAnalyticsStorageReader(Context context) {
    this.context = context.getApplicationContext();
  }

  JSONObject read(String userId) throws Exception {
    SharedPreferences preferences = context.getSharedPreferences(STORE, Context.MODE_PRIVATE);
    String iv = preferences.getString(userId + ".iv", null);
    String ciphertext = preferences.getString(userId + ".value", null);
    if (iv == null && ciphertext == null) return null;
    if (iv == null || ciphertext == null) throw new IllegalStateException("Incomplete legacy analytics entry");
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
    byte[] plaintext = cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP));
    try {
      return new JSONObject(new String(plaintext, StandardCharsets.UTF_8));
    } finally {
      Arrays.fill(plaintext, (byte) 0);
    }
  }

  void remove(String userId) {
    SharedPreferences preferences = context.getSharedPreferences(STORE, Context.MODE_PRIVATE);
    if (!preferences.edit().remove(userId + ".iv").remove(userId + ".value").commit()) {
      throw new IllegalStateException("Legacy analytics entry cleanup failed");
    }
  }

  private SecretKey key() throws Exception {
    java.security.KeyStore keyStore = java.security.KeyStore.getInstance("AndroidKeyStore");
    keyStore.load(null);
    if (!keyStore.containsAlias(KEY_ALIAS)) throw new IllegalStateException("Legacy analytics encryption key is unavailable");
    return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
  }
}
