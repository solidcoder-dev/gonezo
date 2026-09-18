package com.gonezo.multiplatform.plugins;

import android.content.SharedPreferences;
import android.util.Base64;
import com.getcapacitor.JSArray;
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
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "MacroAnalyticsLocalStoragePlugin")
public class MacroAnalyticsLocalStoragePlugin extends Plugin {
  private static final String STORE = "gonezo.macro-analytics.local.v1";
  private static final String KEY_ALIAS = "gonezo.macro-analytics.local.key.v1";

  @PluginMethod public void getContributorId(PluginCall call) {
    withUser(call, (userId, data) -> {
      JSObject result = new JSObject();
      String id = data.optString("contributorId", "");
      if (!id.isEmpty()) result.put("contributorId", id);
      call.resolve(result);
    });
  }

  @PluginMethod public void saveContributorId(PluginCall call) {
    String contributorId = call.getString("contributorId");
    if (contributorId == null || contributorId.trim().isEmpty()) {
      call.reject("Analytics contributor ID is required", "INVALID_CONTRIBUTOR_ID");
      return;
    }
    withUser(call, (userId, data) -> {
      data.put("contributorId", contributorId);
      saveData(userId, data, call);
    });
  }

  @PluginMethod public void getPublication(PluginCall call) {
    String period = call.getString("period");
    withUser(call, (userId, data) -> {
      JSObject result = new JSObject();
      JSONObject publications = data.optJSONObject("publications");
      JSONObject publication = publications == null || period == null ? null : publications.optJSONObject(period);
      if (publication != null) result.put("publication", new JSObject(publication.toString()));
      call.resolve(result);
    });
  }

  @PluginMethod public void savePublication(PluginCall call) {
    JSObject publication = call.getObject("publication");
    String period = publication == null ? null : publication.getString("period");
    if (period == null || period.isEmpty()) {
      call.reject("Publication period is required", "INVALID_PUBLICATION");
      return;
    }
    withUser(call, (userId, data) -> {
      JSONObject publications = data.optJSONObject("publications");
      if (publications == null) publications = new JSONObject();
      publications.put(period, new JSONObject(publication.toString()));
      data.put("publications", publications);
      saveData(userId, data, call);
    });
  }

  @PluginMethod public void removePublication(PluginCall call) {
    String period = call.getString("period");
    withUser(call, (userId, data) -> {
      JSONObject publications = data.optJSONObject("publications");
      if (publications != null) publications.remove(period);
      saveData(userId, data, call);
    });
  }

  @PluginMethod public void listPublications(PluginCall call) {
    withUser(call, (userId, data) -> {
      JSArray publications = new JSArray();
      JSONObject stored = data.optJSONObject("publications");
      if (stored != null) {
        JSONArray periods = stored.names();
        if (periods != null) {
          for (int index = 0; index < periods.length(); index++) {
            JSONObject publication = stored.optJSONObject(periods.optString(index));
            if (publication != null) publications.put(new JSObject(publication.toString()));
          }
        }
      }
      JSObject result = new JSObject();
      result.put("publications", publications);
      call.resolve(result);
    });
  }

  @PluginMethod public void clearPublications(PluginCall call) {
    withUser(call, (userId, data) -> {
      data.put("publications", new JSONObject());
      saveData(userId, data, call);
    });
  }

  private interface UserOperation { void run(String userId, JSONObject data) throws Exception; }

  private void withUser(PluginCall call, UserOperation operation) {
    String userId = call.getString("userId");
    if (userId == null || userId.isEmpty()) {
      call.reject("Authenticated user is required", "INVALID_USER");
      return;
    }
    try {
      operation.run(userId, loadData(userId));
    } catch (Exception error) {
      call.reject("Macro analytics local storage failed", "MACRO_ANALYTICS_STORAGE_FAILURE");
    }
  }

  private JSONObject loadData(String userId) throws Exception {
    SharedPreferences preferences = getContext().getSharedPreferences(STORE, 0);
    String iv = preferences.getString(userId + ".iv", null);
    String ciphertext = preferences.getString(userId + ".value", null);
    if (iv == null || ciphertext == null) return new JSONObject();
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(iv, Base64.NO_WRAP)));
    byte[] plaintext = cipher.doFinal(Base64.decode(ciphertext, Base64.NO_WRAP));
    try { return new JSONObject(new String(plaintext, StandardCharsets.UTF_8)); }
    finally { java.util.Arrays.fill(plaintext, (byte) 0); }
  }

  private void saveData(String userId, JSONObject data, PluginCall call) throws Exception {
    byte[] plaintext = data.toString().getBytes(StandardCharsets.UTF_8);
    byte[] ciphertext = null;
    try {
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, key());
      ciphertext = cipher.doFinal(plaintext);
      SharedPreferences preferences = getContext().getSharedPreferences(STORE, 0);
      boolean saved = preferences.edit()
          .putString(userId + ".iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
          .putString(userId + ".value", Base64.encodeToString(ciphertext, Base64.NO_WRAP))
          .commit();
      if (!saved) throw new IllegalStateException("Encrypted value was not saved");
      call.resolve();
    } finally {
      java.util.Arrays.fill(plaintext, (byte) 0);
      if (ciphertext != null) java.util.Arrays.fill(ciphertext, (byte) 0);
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
        .setKeySize(256).build());
    return generator.generateKey();
  }
}
