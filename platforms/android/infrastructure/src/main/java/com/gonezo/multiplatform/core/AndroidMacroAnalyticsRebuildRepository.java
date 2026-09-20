package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import java.util.ArrayList;
import java.util.List;

public final class AndroidMacroAnalyticsRebuildRepository {
  private final SQLiteDatabase database;

  public AndroidMacroAnalyticsRebuildRepository(CoreDatabase database) {
    this.database = database.getWritableDatabase();
  }

  public void enqueue(String ownerId, String period) {
    ContentValues values = new ContentValues();
    values.put("owner_id", ownerId);
    values.put("period", period);
    database.insertWithOnConflict("macro_analytics_rebuild_periods", null, values, SQLiteDatabase.CONFLICT_IGNORE);
  }

  public List<String> list(String ownerId) {
    List<String> periods = new ArrayList<>();
    try (Cursor cursor = database.query("macro_analytics_rebuild_periods", new String[] {"period"}, "owner_id = ?", new String[] {ownerId}, null, null, "period ASC")) {
      while (cursor.moveToNext()) periods.add(cursor.getString(0));
    }
    return periods;
  }

  public void remove(String ownerId, String period) {
    database.delete("macro_analytics_rebuild_periods", "owner_id = ? and period = ?", new String[] {ownerId, period});
  }

  public void clearPeriods(String ownerId) {
    database.delete("macro_analytics_rebuild_periods", "owner_id = ?", new String[] {ownerId});
  }

  public int getInitialBackfillVersion(String ownerId) {
    try (Cursor cursor = database.query("macro_analytics_rebuild_state", new String[] {"initial_backfill_version"}, "owner_id = ?", new String[] {ownerId}, null, null, null)) {
      return cursor.moveToFirst() ? cursor.getInt(0) : 0;
    }
  }

  public boolean isFullRebuildRequested(String ownerId) {
    try (Cursor cursor = database.query("macro_analytics_rebuild_state", new String[] {"full_rebuild_requested"}, "owner_id = ?", new String[] {ownerId}, null, null, null)) {
      return cursor.moveToFirst() && cursor.getInt(0) != 0;
    }
  }

  public int getFullRebuildRequestVersion(String ownerId) {
    try (Cursor cursor = database.query("macro_analytics_rebuild_state", new String[] {"full_rebuild_request_version"}, "owner_id = ?", new String[] {ownerId}, null, null, null)) {
      return cursor.moveToFirst() ? cursor.getInt(0) : 0;
    }
  }

  public void markInitialBackfillComplete(String ownerId, int version) {
    ensureState(ownerId);
    ContentValues values = new ContentValues();
    values.put("initial_backfill_version", version);
    database.update("macro_analytics_rebuild_state", values, "owner_id = ?", new String[] {ownerId});
  }

  public void requestFullRebuild(String ownerId) {
    ensureState(ownerId);
    database.execSQL("update macro_analytics_rebuild_state set full_rebuild_requested = 1, full_rebuild_request_version = full_rebuild_request_version + 1 where owner_id = ?", new Object[] {ownerId});
  }

  public void clearFullRebuildRequest(String ownerId, int expectedRequestVersion) {
    ensureState(ownerId);
    ContentValues values = new ContentValues();
    values.put("full_rebuild_requested", 0);
    database.update("macro_analytics_rebuild_state", values, "owner_id = ? and full_rebuild_request_version = ?", new String[] {ownerId, Integer.toString(expectedRequestVersion)});
  }

  public void clearState(String ownerId) {
    database.delete("macro_analytics_rebuild_state", "owner_id = ?", new String[] {ownerId});
  }

  private void ensureState(String ownerId) {
    ContentValues values = stateValues(ownerId);
    database.insertWithOnConflict("macro_analytics_rebuild_state", null, values, SQLiteDatabase.CONFLICT_IGNORE);
  }

  private static ContentValues stateValues(String ownerId) {
    ContentValues values = new ContentValues();
    values.put("owner_id", ownerId);
    return values;
  }
}
