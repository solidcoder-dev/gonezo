package com.gonezo.multiplatform.plugins;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import com.gonezo.multiplatform.core.AndroidMacroAnalyticsContributorRepository;
import com.gonezo.multiplatform.core.AndroidMacroAnalyticsOutboxRepository;
import com.gonezo.multiplatform.core.CoreDatabase;
import java.nio.charset.StandardCharsets;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

@RunWith(AndroidJUnit4.class)
public class MacroAnalyticsLegacyMigrationTest {
  private static final String STORE = "gonezo.macro-analytics.local.v1";
  private static final String KEY_ALIAS = "gonezo.macro-analytics.local.key.v1";
  private static final String USER_ID = "legacy-user";
  private Context context;
  private CoreDatabase database;
  private String databaseName;

  @Before public void setUp() {
    context = ApplicationProvider.getApplicationContext();
    databaseName = "gonezo-legacy-macro-" + System.nanoTime() + ".db";
    database = new CoreDatabase(context, databaseName);
    removeLegacy(USER_ID);
    removeLegacy("no-legacy-entry");
  }

  @After public void tearDown() {
    database.close();
    context.deleteDatabase(databaseName);
    removeLegacy(USER_ID);
    removeLegacy("no-legacy-entry");
  }

  @Test public void migratesIdentityAndOutboxThenRemovesOnlyMigratedEntry() throws Exception {
    putLegacy("{\"contributorId\":\"contributor-a\",\"publications\":{\"2026-09\":" + publication(1, "120") + "}}", USER_ID);

    migration().migrate(USER_ID, database);

    assertEquals("contributor-a", new AndroidMacroAnalyticsContributorRepository(database).get(USER_ID));
    assertEquals(1, new org.json.JSONObject(new AndroidMacroAnalyticsOutboxRepository(database).get(USER_ID, "2026-09")).getInt("revision"));
    assertNull(context.getSharedPreferences(STORE, Context.MODE_PRIVATE).getString(USER_ID + ".value", null));
  }

  @Test public void alreadyCommittedStateCanBeRetriedAndMissingLegacyStateIsNoOp() throws Exception {
    AndroidMacroAnalyticsContributorRepository identity = new AndroidMacroAnalyticsContributorRepository(database);
    AndroidMacroAnalyticsOutboxRepository outbox = new AndroidMacroAnalyticsOutboxRepository(database);
    identity.save(USER_ID, "contributor-a");
    outbox.save(USER_ID, publication(1, "120"));
    putLegacy("{\"contributorId\":\"contributor-a\",\"publications\":{\"2026-09\":" + publication(1, "120") + "}}", USER_ID);

    migration().migrate(USER_ID, database);
    migration().migrate("no-legacy-entry", database);

    assertEquals(1, outbox.listPending(USER_ID).size());
    assertNull(context.getSharedPreferences(STORE, Context.MODE_PRIVATE).getString(USER_ID + ".value", null));
  }

  @Test public void identityConflictPreservesLegacySource() throws Exception {
    new AndroidMacroAnalyticsContributorRepository(database).save(USER_ID, "database-contributor");
    putLegacy("{\"contributorId\":\"legacy-contributor\"}", USER_ID);

    assertThrows(IllegalStateException.class, () -> migration().migrate(USER_ID, database));

    assertTrue(context.getSharedPreferences(STORE, Context.MODE_PRIVATE).contains(USER_ID + ".value"));
  }

  @Test public void olderLegacyRevisionDoesNotReplaceNewerDatabaseState() throws Exception {
    AndroidMacroAnalyticsOutboxRepository outbox = new AndroidMacroAnalyticsOutboxRepository(database);
    outbox.save(USER_ID, publication(2, "240"));
    putLegacy("{\"publications\":{\"2026-09\":" + publication(1, "120") + "}}", USER_ID);

    migration().migrate(USER_ID, database);

    assertEquals(2, new org.json.JSONObject(outbox.get(USER_ID, "2026-09")).getInt("revision"));
    assertNull(context.getSharedPreferences(STORE, Context.MODE_PRIVATE).getString(USER_ID + ".value", null));
  }

  @Test public void sameRevisionWithDifferentPayloadPreservesLegacySource() throws Exception {
    AndroidMacroAnalyticsOutboxRepository outbox = new AndroidMacroAnalyticsOutboxRepository(database);
    outbox.save(USER_ID, publication(1, "240"));
    putLegacy("{\"publications\":{\"2026-09\":" + publication(1, "120") + "}}", USER_ID);

    assertThrows(IllegalStateException.class, () -> migration().migrate(USER_ID, database));

    assertTrue(context.getSharedPreferences(STORE, Context.MODE_PRIVATE).contains(USER_ID + ".value"));
  }

  private MacroAnalyticsLegacyMigration migration() {
    return new MacroAnalyticsLegacyMigration(new LegacyMacroAnalyticsStorageReader(context));
  }

  private void putLegacy(String json, String ownerId) throws Exception {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, key());
    byte[] encrypted = cipher.doFinal(json.getBytes(StandardCharsets.UTF_8));
    SharedPreferences preferences = context.getSharedPreferences(STORE, Context.MODE_PRIVATE);
    preferences.edit()
        .putString(ownerId + ".iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
        .putString(ownerId + ".value", Base64.encodeToString(encrypted, Base64.NO_WRAP))
        .commit();
  }

  private void removeLegacy(String ownerId) {
    context.getSharedPreferences(STORE, Context.MODE_PRIVATE).edit()
        .remove(ownerId + ".iv").remove(ownerId + ".value").commit();
  }

  private SecretKey key() throws Exception {
    java.security.KeyStore keyStore = java.security.KeyStore.getInstance("AndroidKeyStore");
    keyStore.load(null);
    if (keyStore.containsAlias(KEY_ALIAS)) return (SecretKey) keyStore.getKey(KEY_ALIAS, null);
    KeyGenerator generator = KeyGenerator.getInstance("AES", "AndroidKeyStore");
    generator.init(new android.security.keystore.KeyGenParameterSpec.Builder(KEY_ALIAS,
        android.security.keystore.KeyProperties.PURPOSE_ENCRYPT | android.security.keystore.KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
    return generator.generateKey();
  }

  private String publication(int revision, String amount) {
    return "{\"protocolVersion\":1,\"contributorId\":\"contributor-a\",\"period\":{\"kind\":\"YEAR_MONTH\",\"value\":\"2026-09\"},\"revision\":" + revision
        + ",\"contribution\":{\"schemaVersion\":1,\"period\":{\"kind\":\"YEAR_MONTH\",\"value\":\"2026-09\"},\"dimensions\":{\"countryCode\":\"ES\",\"regionCode\":\"ES-CN\",\"sex\":\"FEMALE\",\"ageBand\":\"25_34\"},\"financial\":{\"currencies\":[{\"currency\":\"EUR\",\"buckets\":[{\"source\":\"POSTED\",\"kind\":\"EXPENSE\",\"amount\":\"" + amount + "\",\"count\":1}]}]}}}";
  }
}
