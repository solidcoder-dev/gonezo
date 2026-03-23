package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import java.time.Instant;

final class AndroidMobillsImportFingerprintRepository {
  private static final String TABLE = "mobills_import_fingerprints";
  private static final String SOURCE = "mobills";

  private final CoreDatabase db;

  AndroidMobillsImportFingerprintRepository(CoreDatabase db) {
    this.db = db;
  }

  String findTransactionIdByFingerprint(String fingerprint) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      TABLE,
      new String[] {"transaction_id"},
      "source = ? and fingerprint = ?",
      new String[] {SOURCE, fingerprint},
      null,
      null,
      null
    );
    try {
      if (!cursor.moveToFirst()) {
        return null;
      }
      return cursor.getString(0);
    } finally {
      cursor.close();
    }
  }

  void recordImported(String fingerprint, String transactionId, Instant seenAt) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("source", SOURCE);
    values.put("fingerprint", fingerprint);
    values.put("transaction_id", transactionId);
    values.put("first_seen_at", seenAt.toString());
    values.put("last_seen_at", seenAt.toString());
    values.put("seen_count", 1);

    long inserted = database.insertWithOnConflict(TABLE, null, values, SQLiteDatabase.CONFLICT_IGNORE);
    if (inserted == -1) {
      touchDuplicate(fingerprint, seenAt);
    }
  }

  void touchDuplicate(String fingerprint, Instant seenAt) {
    SQLiteDatabase database = db.getWritableDatabase();
    database.execSQL(
      "update " + TABLE + " set last_seen_at = ?, seen_count = seen_count + 1 where source = ? and fingerprint = ?",
      new Object[] {seenAt.toString(), SOURCE, fingerprint}
    );
  }
}
