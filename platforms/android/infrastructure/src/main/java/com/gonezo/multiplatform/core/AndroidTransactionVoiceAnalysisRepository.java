package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

final class AndroidTransactionVoiceAnalysisRepository {
  private static final String TABLE = "transaction_voice_analysis";

  private final CoreDatabase db;

  AndroidTransactionVoiceAnalysisRepository(CoreDatabase db) {
    this.db = db;
  }

  void recordCapture(
    String analysisId,
    String recordingId,
    String recordingPath,
    String accountId,
    String expectedType,
    String initialDraftJson,
    String createdAt
  ) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("analysis_id", analysisId);
    values.put("recording_id", recordingId);
    values.put("recording_path", recordingPath);
    values.put("account_id", accountId);
    values.put("expected_type", expectedType);
    values.put("initial_draft_json", initialDraftJson);
    values.put("created_at", createdAt);

    long result = database.insertWithOnConflict(TABLE, null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to store voice analysis capture: " + analysisId);
    }
  }

  boolean exists(String analysisId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      TABLE,
      new String[] {"analysis_id"},
      "analysis_id = ?",
      new String[] {analysisId},
      null,
      null,
      null
    );
    try {
      return cursor.moveToFirst();
    } finally {
      cursor.close();
    }
  }

  void finalizeCapture(
    String analysisId,
    String outcome,
    String transactionIdsJson,
    String finalDraftJson,
    String errorMessage,
    String finalizedAt
  ) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("outcome", outcome);
    values.put("transaction_ids_json", transactionIdsJson);
    values.put("final_draft_json", finalDraftJson);
    values.put("error_message", errorMessage);
    values.put("finalized_at", finalizedAt);

    int updated = database.update(TABLE, values, "analysis_id = ?", new String[] {analysisId});
    if (updated == 0) {
      throw new IllegalStateException("Voice analysis not found: " + analysisId);
    }
  }
}
