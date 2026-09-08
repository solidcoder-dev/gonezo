package com.gonezo.multiplatform.core;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import com.gonezo.taxonomy.domain.CategoryId;
import com.gonezo.taxonomy.domain.TransactionItemCategoryAssignment;
import com.gonezo.taxonomy.domain.ports.TransactionItemCategoryAssignmentRepository;
import java.time.Instant;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

final class AndroidTaxonomyTransactionItemCategoryAssignmentRepository implements TransactionItemCategoryAssignmentRepository {
  private final CoreDatabase db;

  AndroidTaxonomyTransactionItemCategoryAssignmentRepository(CoreDatabase db) {
    this.db = db;
  }

  @Override
  public void upsert(TransactionItemCategoryAssignment assignment) {
    ContentValues values = new ContentValues();
    values.put("transaction_item_id", assignment.getTransactionItemId().toString());
    values.put("category_id", assignment.getCategoryId().toString());
    values.put("assigned_at", assignment.getAssignedAt().toString());
    long result = db.getWritableDatabase().insertWithOnConflict("taxonomy_transaction_item_category_assignments", null, values, SQLiteDatabase.CONFLICT_REPLACE);
    if (result == -1) throw new IllegalStateException("Failed to upsert taxonomy item category assignment: " + assignment.getTransactionItemId());
  }

  @Override
  public void deleteByTransactionItemIds(Collection<UUID> transactionItemIds) {
    for (UUID transactionItemId : transactionItemIds) {
      db.getWritableDatabase().delete("taxonomy_transaction_item_category_assignments", "transaction_item_id = ?", new String[] {transactionItemId.toString()});
    }
  }

  @Override
  public Map<UUID, TransactionItemCategoryAssignment> findByTransactionItemIds(Collection<UUID> transactionItemIds) {
    if (transactionItemIds.isEmpty()) return Collections.emptyMap();
    StringBuilder placeholders = new StringBuilder();
    String[] args = new String[transactionItemIds.size()];
    int index = 0;
    for (UUID transactionItemId : transactionItemIds) {
      if (index > 0) placeholders.append(",");
      placeholders.append("?");
      args[index++] = transactionItemId.toString();
    }
    Cursor cursor = db.getReadableDatabase().query(
      "taxonomy_transaction_item_category_assignments",
      new String[] {"transaction_item_id", "category_id", "assigned_at"},
      "transaction_item_id in (" + placeholders + ")", args, null, null, null
    );
    try {
      Map<UUID, TransactionItemCategoryAssignment> result = new HashMap<>();
      while (cursor.moveToNext()) {
        UUID itemId = UUID.fromString(cursor.getString(0));
        result.put(itemId, new TransactionItemCategoryAssignment(itemId, CategoryId.Companion.from(cursor.getString(1)), Instant.parse(cursor.getString(2))));
      }
      return result;
    } finally {
      cursor.close();
    }
  }
}
