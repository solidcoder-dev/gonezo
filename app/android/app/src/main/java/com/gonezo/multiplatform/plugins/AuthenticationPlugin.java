package com.gonezo.multiplatform.plugins;

import android.util.Base64;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
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
  public void isDeviceAuthenticationAvailable(PluginCall call) {
    int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG
        | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
    boolean available = BiometricManager.from(getContext()).canAuthenticate(authenticators)
        == BiometricManager.BIOMETRIC_SUCCESS;
    JSObject result = new JSObject();
    result.put("available", available);
    call.resolve(result);
  }

  @PluginMethod
  public void authenticateDevice(PluginCall call) {
    if (!getContext().getSharedPreferences(STORE, 0).getBoolean("deviceUnlockEnabled", false)) {
      call.reject("Device unlock is not enabled", "DEVICE_UNLOCK_DISABLED");
      return;
    }
    int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG
        | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
    if (BiometricManager.from(getContext()).canAuthenticate(authenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
      call.reject("Device authentication is unavailable", "DEVICE_AUTHENTICATION_UNAVAILABLE");
      return;
    }
    BiometricPrompt.PromptInfo prompt = new BiometricPrompt.PromptInfo.Builder()
        .setTitle("Unlock Gonezo")
        .setAllowedAuthenticators(authenticators)
        .build();
    BiometricPrompt biometricPrompt = new BiometricPrompt(getActivity(), ContextCompat.getMainExecutor(getContext()), new BiometricPrompt.AuthenticationCallback() {
      @Override
      public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
        call.resolve();
      }

      @Override
      public void onAuthenticationError(int errorCode, CharSequence errorString) {
        String code = errorCode == BiometricPrompt.ERROR_USER_CANCELED
            || errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON
            || errorCode == BiometricPrompt.ERROR_CANCELED
            ? "AUTHENTICATION_CANCELLED" : "DEVICE_AUTHENTICATION_FAILED";
        call.reject("Device authentication failed", code);
      }
    });
    biometricPrompt.authenticate(prompt);
  }

  @PluginMethod
  public void isDeviceUnlockEnabled(PluginCall call) {
    JSObject result = new JSObject();
    result.put("enabled", getContext().getSharedPreferences(STORE, 0).getBoolean("deviceUnlockEnabled", false));
    call.resolve(result);
  }

  @PluginMethod
  public void enableDeviceUnlock(PluginCall call) {
    if (!getContext().getSharedPreferences(STORE, 0).edit().putBoolean("deviceUnlockEnabled", true).commit()) {
      call.reject("Device unlock settings could not be saved", "SECURE_STORAGE_FAILURE");
      return;
    }
    call.resolve();
  }

  @PluginMethod
  public void disableDeviceUnlock(PluginCall call) {
    if (!getContext().getSharedPreferences(STORE, 0).edit().remove("deviceUnlockEnabled").commit()) {
      call.reject("Device unlock settings could not be saved", "SECURE_STORAGE_FAILURE");
      return;
    }
    call.resolve();
  }

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
      boolean saved = getContext().getSharedPreferences(STORE, 0).edit()
          .putString("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
          .putString("ciphertext", Base64.encodeToString(ciphertext, Base64.NO_WRAP))
          .commit();
      java.util.Arrays.fill(ciphertext, (byte) 0);
      if (!saved) {
        call.reject("Secure credentials could not be saved", "SECURE_STORAGE_FAILURE");
        return;
      }
      call.resolve();
    } catch (Exception error) {
      call.reject("Secure credentials could not be saved", "SECURE_STORAGE_FAILURE");
    } finally {
      java.util.Arrays.fill(plaintext, (byte) 0);
    }
  }

  @PluginMethod
  public void readSession(PluginCall call) {
    try {
      String userId = readEncryptedValue("sessionIv", "sessionCiphertext");
      JSObject result = new JSObject();
      if (userId != null) result.put("userId", userId);
      call.resolve(result);
    } catch (Exception error) {
      call.reject("Secure session is unavailable", "SECURE_STORAGE_FAILURE");
    }
  }

  @PluginMethod
  public void saveSession(PluginCall call) {
    String userId = call.getString("userId");
    if (userId == null || userId.isEmpty()) {
      call.reject("Authenticated user is required", "INVALID_SESSION");
      return;
    }
    saveEncryptedValue("sessionIv", "sessionCiphertext", userId, call);
  }

  @PluginMethod
  public void clearSession(PluginCall call) {
    boolean cleared = getContext().getSharedPreferences(STORE, 0).edit()
        .remove("sessionIv")
        .remove("sessionCiphertext")
        .commit();
    if (!cleared) {
      call.reject("Secure session could not be cleared", "SECURE_STORAGE_FAILURE");
      return;
    }
    call.resolve();
  }

  private String readEncryptedValue(String ivKey, String ciphertextKey) throws Exception {
    android.content.SharedPreferences preferences = getContext().getSharedPreferences(STORE, 0);
    String iv = preferences.getString(ivKey, null);
    String ciphertext = preferences.getString(ciphertextKey, null);
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

  private void saveEncryptedValue(String ivKey, String ciphertextKey, String value, PluginCall call) {
    byte[] plaintext = value.getBytes(StandardCharsets.UTF_8);
    byte[] ciphertext = null;
    try {
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, key());
      ciphertext = cipher.doFinal(plaintext);
      boolean saved = getContext().getSharedPreferences(STORE, 0).edit()
          .putString(ivKey, Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
          .putString(ciphertextKey, Base64.encodeToString(ciphertext, Base64.NO_WRAP))
          .commit();
      if (!saved) {
        call.reject("Secure value could not be saved", "SECURE_STORAGE_FAILURE");
        return;
      }
      call.resolve();
    } catch (Exception error) {
      call.reject("Secure value could not be saved", "SECURE_STORAGE_FAILURE");
    } finally {
      java.util.Arrays.fill(plaintext, (byte) 0);
      if (ciphertext != null) java.util.Arrays.fill(ciphertext, (byte) 0);
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
