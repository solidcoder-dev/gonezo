package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.taxonomy.domain.CategoryId;
import com.gonezo.taxonomy.domain.TransactionCategoryAssignment;
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

final class AndroidTaxonomyTransactionCategoryAssignmentRepository implements TransactionCategoryAssignmentRepository {
  private final CoreDatabase db;

  AndroidTaxonomyTransactionCategoryAssignmentRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public void upsert(TransactionCategoryAssignment assignment) {
    SQLiteDatabase database = db.getWritableDatabase();
    ContentValues values = new ContentValues();
    values.put("transaction_id", assignment.getTransactionId().toString());
    values.put("category_id", assignment.getCategoryId().toString());
    values.put("assigned_at", assignment.getAssignedAt().toString());

    long result = database.insertWithOnConflict("taxonomy_transaction_assignments", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) {
      throw new IllegalStateException("Failed to upsert taxonomy assignment for transaction: " + assignment.getTransactionId());
    }
  }

  @Override
  public void deleteByTransactionId(UUID transactionId) {
    SQLiteDatabase database = db.getWritableDatabase();
    database.delete("taxonomy_transaction_assignments", "transaction_id = ?", new String[] {transactionId.toString()});
  }

  @Override
  public TransactionCategoryAssignment findByTransactionId(UUID transactionId) {
    SQLiteDatabase database = db.getReadableDatabase();
    Cursor cursor = database.query(
      "taxonomy_transaction_assignments",
      new String[] {"transaction_id", "category_id", "assigned_at"},
      "transaction_id = ?",
      new String[] {transactionId.toString()},
      null,
      null,
      null
    );
    try {
      if (!cursor.moveToFirst()) {
        return null;
      }
      return mapAssignment(cursor);
    } finally {
      cursor.close();
    }
  }

  @Override
  public Map<UUID, TransactionCategoryAssignment> findByTransactionIds(Collection<UUID> transactionIds) {
    if (transactionIds.isEmpty()) {
      return Collections.emptyMap();
    }

    SQLiteDatabase database = db.getReadableDatabase();
    StringBuilder placeholders = new StringBuilder();
    String[] args = new String[transactionIds.size()];
    int index = 0;
    for (UUID transactionId : transactionIds) {
      if (index > 0) {
        placeholders.append(",");
      }
      placeholders.append("?");
      args[index] = transactionId.toString();
      index += 1;
    }

    Cursor cursor = database.query(
      "taxonomy_transaction_assignments",
      new String[] {"transaction_id", "category_id", "assigned_at"},
      "transaction_id in (" + placeholders + ")",
      args,
      null,
      null,
      null
    );

    try {
      List<TransactionCategoryAssignment> assignments = new ArrayList<>();
      while (cursor.moveToNext()) {
        assignments.add(mapAssignment(cursor));
      }
      Map<UUID, TransactionCategoryAssignment> result = new HashMap<>();
      for (TransactionCategoryAssignment assignment : assignments) {
        result.put(assignment.getTransactionId(), assignment);
      }
      return result;
    } finally {
      cursor.close();
    }
  }

  private static TransactionCategoryAssignment mapAssignment(Cursor cursor) {
    return new TransactionCategoryAssignment(
      UUID.fromString(cursor.getString(0)),
      CategoryId.Companion.from(cursor.getString(1)),
      Instant.parse(cursor.getString(2))
    );
  }
}
