package com.gonezo.multiplatform.plugins;

import com.gonezo.multiplatform.core.AndroidMacroAnalyticsContributorRepository;
import com.gonezo.multiplatform.core.AndroidMacroAnalyticsOutboxRepository;
import com.gonezo.multiplatform.core.CoreDatabase;
import org.json.JSONObject;

final class MacroAnalyticsLegacyMigration {
  private final LegacyMacroAnalyticsStorageReader reader;

  MacroAnalyticsLegacyMigration(LegacyMacroAnalyticsStorageReader reader) {
    this.reader = reader;
  }

  void migrate(String userId, CoreDatabase database) throws Exception {
    JSONObject legacy = reader.read(userId);
    if (legacy == null) return;
    database.getWritableDatabase().beginTransaction();
    try {
      String contributorId = legacy.optString("contributorId", "");
      if (!contributorId.isEmpty()) new AndroidMacroAnalyticsContributorRepository(database).save(userId, contributorId);
      JSONObject publications = legacy.optJSONObject("publications");
      if (publications != null) {
        java.util.Iterator<String> periods = publications.keys();
        AndroidMacroAnalyticsOutboxRepository outbox = new AndroidMacroAnalyticsOutboxRepository(database);
        while (periods.hasNext()) {
          JSONObject publication = publications.optJSONObject(periods.next());
          if (publication != null) outbox.migrate(userId, publication.toString());
        }
      }
      database.getWritableDatabase().setTransactionSuccessful();
    } finally {
      database.getWritableDatabase().endTransaction();
    }
    verifyMigratedState(userId, legacy, database);
    reader.remove(userId);
  }

  private void verifyMigratedState(String userId, JSONObject legacy, CoreDatabase database) throws Exception {
    String contributorId = legacy.optString("contributorId", "");
    if (!contributorId.isEmpty()
        && !contributorId.equals(new AndroidMacroAnalyticsContributorRepository(database).get(userId))) {
      throw new IllegalStateException("Legacy analytics identity was not migrated");
    }
    JSONObject publications = legacy.optJSONObject("publications");
    if (publications == null) return;
    AndroidMacroAnalyticsOutboxRepository outbox = new AndroidMacroAnalyticsOutboxRepository(database);
    java.util.Iterator<String> periods = publications.keys();
    while (periods.hasNext()) {
      String period = periods.next();
      if (publications.optJSONObject(period) != null && outbox.get(userId, period) == null) {
        throw new IllegalStateException("Legacy analytics publication was not migrated");
      }
    }
  }
}
