package com.gonezo.multiplatform.core;

import android.database.sqlite.SQLiteDatabase;
import com.gonezo.application.ConsistencyBoundary;
import kotlin.jvm.functions.Function0;

final class AndroidConsistencyBoundary implements ConsistencyBoundary {
  private final CoreDatabase db;

  AndroidConsistencyBoundary(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public <T> T withinConsistencyBoundary(Function0<? extends T> block) {
    SQLiteDatabase database = db.getWritableDatabase();
    if (database.inTransaction()) {
      return block.invoke();
    }

    database.beginTransaction();
    try {
      T result = block.invoke();
      database.setTransactionSuccessful();
      return result;
    } finally {
      database.endTransaction();
    }
  }
}
