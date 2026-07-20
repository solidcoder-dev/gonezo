package com.gonezo.multiplatform.core

import android.database.Cursor

internal class AndroidExpectedViewMapper(private val database: CoreDatabase) {
  fun readExpectedMovements(cursor: Cursor): List<AndroidExpectedCore.ExpectedMovementView> {
    val items = mutableListOf<AndroidExpectedCore.ExpectedMovementView>()
    while (cursor.moveToNext()) {
      val movementId = cursor.getString(0)
      items.add(
        AndroidExpectedCore.ExpectedMovementView(
          id = movementId,
          accountId = cursor.getString(1),
          type = cursor.getString(2),
          amount = cursor.getString(3),
          currency = cursor.getString(4),
          expectedAt = cursor.getString(5),
          description = cursor.getStringOrNull(6),
          merchant = cursor.getStringOrNull(7),
          categoryId = cursor.getStringOrNull(8),
          originOccurrenceId = cursor.getStringOrNull(9),
          originRecurringMovementId = cursor.getStringOrNull(10),
          status = cursor.getString(11),
          resolvedTransactionId = cursor.getStringOrNull(12),
          createdAt = cursor.getString(13),
          updatedAt = cursor.getString(14),
          resolvedAt = cursor.getStringOrNull(15),
          dismissedAt = cursor.getStringOrNull(16),
          splitItems = loadSplitItems(movementId),
        ),
      )
    }
    return items
  }

  private fun loadSplitItems(expectedMovementId: String): List<AndroidExpectedCore.SplitItem> {
    val cursor = database.readableDatabase.query(
      "expected_movement_items",
      arrayOf("id", "name", "amount", "source_template_item_id"),
      "expected_movement_id = ?",
      arrayOf(expectedMovementId),
      null,
      null,
      "item_order asc, id asc",
    )
    return cursor.use {
      val items = mutableListOf<AndroidExpectedCore.SplitItem>()
      while (it.moveToNext()) {
        items.add(
          AndroidExpectedCore.SplitItem(
            id = it.getString(0),
            name = it.getString(1),
            amount = it.getString(2),
            sourceTemplateItemId = it.getStringOrNull(3),
          ),
        )
      }
      items
    }
  }

  private fun Cursor.getStringOrNull(index: Int): String? =
    if (isNull(index)) null else getString(index)
}
