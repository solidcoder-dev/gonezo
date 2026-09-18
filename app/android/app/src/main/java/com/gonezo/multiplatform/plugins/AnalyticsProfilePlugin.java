package com.gonezo.multiplatform.plugins;

import android.util.Base64;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "AnalyticsProfilePlugin")
public class AnalyticsProfilePlugin extends Plugin {
  private static final String STORE = "gonezo.analytics.profile.v1";
  private static final String KEY_ALIAS = "gonezo.analytics.profile.key.v1";

  @PluginMethod
  public void get(PluginCall call) {
    String userId = call.getString("userId");
    if (userId == null || userId.isEmpty()) {
      call.reject("Authenticated user is required", "INVALID_USER");
      return;
    }
    try {
      String profile = readProfile(userId);
      JSObject result = new JSObject();
      if (profile != null) result.put("profile", new JSObject(profile));
      call.resolve(result);
    } catch (Exception error) {
      call.reject("Analytics profile could not be loaded", "PROFILE_STORAGE_FAILURE");
    }
  }

  @PluginMethod
  public void save(PluginCall call) {
    JSObject profile = call.getObject("profile");
    String userId = profile == null ? null : profile.getString("userId");
    if (profile == null || userId == null || userId.isEmpty()) {
      call.reject("Profile and authenticated user are required", "INVALID_PROFILE");
      return;
    }
    byte[] plaintext = profile.toString().getBytes(StandardCharsets.UTF_8);
    byte[] ciphertext = null;
    try {
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, key());
      ciphertext = cipher.doFinal(plaintext);
      String ivKey = userId + ".iv";
      String valueKey = userId + ".value";
      boolean saved = getContext().getSharedPreferences(STORE, 0).edit()
          .putString(ivKey, Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
          .putString(valueKey, Base64.encodeToString(ciphertext, Base64.NO_WRAP))
          .commit();
      if (!saved) {
        call.reject("Analytics profile could not be saved", "PROFILE_STORAGE_FAILURE");
        return;
      }
      call.resolve();
    } catch (Exception error) {
      call.reject("Analytics profile could not be saved", "PROFILE_STORAGE_FAILURE");
    } finally {
      java.util.Arrays.fill(plaintext, (byte) 0);
      if (ciphertext != null) java.util.Arrays.fill(ciphertext, (byte) 0);
    }
  }

  private String readProfile(String userId) throws Exception {
    SharedPreferences preferences = getContext().getSharedPreferences(STORE, 0);
    String iv = preferences.getString(userId + ".iv", null);
    String ciphertext = preferences.getString(userId + ".value", null);
    if (iv == null || ciphertext == null) return null;
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
    byte[] plaintext = cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP));
    try {
      return new String(plaintext, StandardCharsets.UTF_8);
    } finally {
      java.util.Arrays.fill(plaintext, (byte) 0);
    }
  }

  private SecretKey key() throws Exception {
    java.security.KeyStore keyStore = java.security.KeyStore.getInstance("AndroidKeyStore");
    keyStore.load(null);
    if (keyStore.containsAlias(KEY_ALIAS)) return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
    KeyGenerator generator = KeyGenerator.getInstance("AES", "AndroidKeyStore");
    generator.init(new android.security.keystore.KeyGenParameterSpec.Builder(
        KEY_ALIAS, android.security.keystore.KeyProperties.PURPOSE_ENCRYPT | android.security.keystore.KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256)
        .build());
    return generator.generateKey();
  }
}
