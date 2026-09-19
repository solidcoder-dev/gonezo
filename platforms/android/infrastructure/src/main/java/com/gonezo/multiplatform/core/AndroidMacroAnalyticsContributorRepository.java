package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

public final class AndroidMacroAnalyticsContributorRepository {
  private final CoreDatabase database;

  public AndroidMacroAnalyticsContributorRepository(CoreDatabase database) {
    this.database = database;
  }

  public String get(String ownerId) {
    try (Cursor cursor = database.getReadableDatabase().query(
        "macro_analytics_contributors", new String[] {"contributor_id"}, "owner_id = ?",
        new String[] {ownerId}, null, null, null)) {
      return cursor.moveToFirst() ? cursor.getString(0) : null;
    }
  }

  public void save(String ownerId, String contributorId) {
    SQLiteDatabase db = database.getWritableDatabase();
    db.beginTransaction();
    try {
      String existing = get(ownerId);
      if (existing != null && !existing.equals(contributorId)) {
        throw new IllegalStateException("Analytics contributor identity conflict");
      }
      if (existing == null) {
        ContentValues values = new ContentValues();
        values.put("owner_id", ownerId);
        values.put("contributor_id", contributorId);
        db.insertOrThrow("macro_analytics_contributors", null, values);
      }
      db.setTransactionSuccessful();
    } finally {
      db.endTransaction();
    }
  }
}
