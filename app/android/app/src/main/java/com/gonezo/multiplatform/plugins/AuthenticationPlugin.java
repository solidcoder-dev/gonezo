package com.gonezo.multiplatform.plugins;

import android.util.Base64;
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

@CapacitorPlugin(name = "AuthenticationPlugin")
public class AuthenticationPlugin extends Plugin {
  private static final String KEY_ALIAS = "gonezo.authentication.credentials.v1";
  private static final String STORE = "gonezo.authentication.secure.v1";

  @PluginMethod
  public void readCredentials(PluginCall call) {
    try {
      String iv = getContext().getSharedPreferences(STORE, 0).getString("iv", null);
      String ciphertext = getContext().getSharedPreferences(STORE, 0).getString("ciphertext", null);
      JSObject result = new JSObject();
      if (iv != null && ciphertext != null) {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
        byte[] plaintext = cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP));
        result.put("value", new String(plaintext, StandardCharsets.UTF_8));
        java.util.Arrays.fill(plaintext, (byte) 0);
      }
      call.resolve(result);
    } catch (Exception error) {
      call.reject("Secure credentials are unavailable", "SECURE_STORAGE_FAILURE");
    }
  }

  @PluginMethod
  public void saveCredentials(PluginCall call) {
    String value = call.getString("value");
    if (value == null) {
      call.reject("Credentials are required", "INVALID_CREDENTIALS");
      return;
    }
    byte[] plaintext = value.getBytes(StandardCharsets.UTF_8);
    try {
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, key());
      byte[] ciphertext = cipher.doFinal(plaintext);
      getContext().getSharedPreferences(STORE, 0).edit()
          .putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
          .putString("ciphertext", Base64.encodeToString(ciphertext, Base64.NO_WRAP))
          .apply();
      java.util.Arrays.fill(ciphertext, (byte) 0);
      call.resolve();
    } catch (Exception error) {
      call.reject("Secure credentials could not be saved", "SECURE_STORAGE_FAILURE");
    } finally {
      java.util.Arrays.fill(plaintext, (byte) 0);
    }
  }

  private SecretKey key() throws Exception {
    java.security.KeyStore keyStore = java.security.KeyStore.getInstance("AndroidKeyStore");
    keyStore.load(null);
    if (keyStore.containsAlias(KEY_ALIAS)) {
      return ((SecretKey) keyStore.getKey(KEY_ALIAS, null));
    }
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
