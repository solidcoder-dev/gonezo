package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.domain.investments.FinancialContainer;
import com.gonezo.domain.investments.ports.FinancialContainerRepository;
import java.util.UUID;

final class AndroidFinancialContainerRepository implements FinancialContainerRepository {
  private final CoreDatabase db;

  AndroidFinancialContainerRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public FinancialContainer get(UUID id) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "financial_containers",
      new String[] {"id", "user_id", "name", "container_type", "currency"},
      "id = ?",
      new String[] {id.toString()},
      null,
      null,
      null
    );
    try {
      if (!cursor.moveToFirst()) {
        throw new IllegalStateException("Financial container not found: " + id);
      }
      return new FinancialContainer(
        UUID.fromString(cursor.getString(0)),
        UUID.fromString(cursor.getString(1)),
        cursor.getString(2),
        cursor.getString(3),
        cursor.getString(4)
      );
    } finally {
      cursor.close();
    }
  }

  void save(FinancialContainer container) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("id", container.getId().toString());
    values.put("user_id", container.getUserId().toString());
    values.put("name", container.getName());
    values.put("container_type", container.getContainerType());
    values.put("currency", container.getCurrency());

    long result = database.insertWithOnConflict("financial_containers", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to save financial container: " + container.getId());
    }
  }
}
