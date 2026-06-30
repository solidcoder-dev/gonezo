package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class AndroidAnalyticsCore {
  private static AndroidAnalyticsCore instance;
  private final CoreDatabase database;

  private AndroidAnalyticsCore(Context context) {
    this.database = new CoreDatabase(context.getApplicationContext());
  }

  public static synchronized AndroidAnalyticsCore getInstance(Context context) {
    if (instance == null) {
      instance = new AndroidAnalyticsCore(context);
    }
    return instance;
  }

  public void setMovementIgnored(String movementId, boolean ignored, String changedAt) {
    setScopeIgnored("movement", movementId, ignored, changedAt);
  }

  public void setExpectedMovementIgnored(String expectedMovementId, boolean ignored, String changedAt) {
    setScopeIgnored("expected_movement", expectedMovementId, ignored, changedAt);
  }

  private void setScopeIgnored(String scopeType, String scopeId, boolean ignored, String changedAt) {
    if (scopeId == null || scopeId.trim().isEmpty()) {
      throw new IllegalArgumentException("movementId is required");
    }

    SQLiteDatabase writableDatabase = database.getWritableDatabase();
    writableDatabase.delete(
      "analytics_exclusions",
      "scope_type = ? and scope_id = ? and reason = ?",
      new String[] { scopeType, scopeId, "user_ignored" }
    );

    if (!ignored) {
      return;
    }

    ContentValues values = new ContentValues();
    values.put("id", UUID.randomUUID().toString());
    values.put("scope_type", scopeType);
    values.put("scope_id", scopeId);
    values.put("reason", "user_ignored");
    values.put("created_at", changedAt != null && !changedAt.trim().isEmpty() ? changedAt : Instant.now().toString());
    writableDatabase.insertWithOnConflict(
      "analytics_exclusions",
      null,
      values,
      SQLiteDatabase.CONFLICT_IGNORE
    );
  }

  public List<String> listIgnoredMovements() {
    return listIgnoredScopeIds("movement");
  }

  public List<String> listIgnoredExpectedMovements() {
    return listIgnoredScopeIds("expected_movement");
  }

  private List<String> listIgnoredScopeIds(String scopeType) {
    List<String> movementIds = new ArrayList<>();
    Cursor cursor = database.getReadableDatabase().query(
      "analytics_exclusions",
      new String[] { "scope_id" },
      "scope_type = ? and reason = ?",
      new String[] { scopeType, "user_ignored" },
      null,
      null,
      null
    );
    try (cursor) {
      while (cursor.moveToNext()) {
        String movementId = cursor.getString(0);
        if (!movementIds.contains(movementId)) {
          movementIds.add(movementId);
        }
      }
    }
    return movementIds;
  }
}
