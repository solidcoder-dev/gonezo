package com.gonezo.multiplatform.core

import android.content.ContentValues
import com.gonezo.recurrence.domain.RecurringMovement
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

internal class AndroidRecurringExpectedSqliteStore(
  private val database: CoreDatabase,
  private val expectedCore: AndroidExpectedCore,
) : AndroidRecurringExpectedCoordinator.Store {
  override fun findPendingExpectedMovementId(recurringMovementId: String): String? =
    querySingleText(
      table = "expected_movements",
      column = "id",
      selection = "origin_recurring_movement_id = ? and status = ?",
      selectionArgs = arrayOf(recurringMovementId, "pending"),
    )

  override fun findOccurrenceId(recurringMovementId: String, dueAt: String): String? =
    querySingleText(
      table = "recurring_movement_occurrences",
      column = "id",
      selection = "recurring_movement_id = ? and due_at = ?",
      selectionArgs = arrayOf(recurringMovementId, dueAt),
    )

  override fun createPendingOccurrence(recurringMovementId: String, dueAt: String, createdAt: String): String {
    val occurrenceId = UUID.randomUUID().toString()
    val values = ContentValues()
    values.put("id", occurrenceId)
    values.put("recurring_movement_id", recurringMovementId)
    values.put("due_at", dueAt)
    values.put("status", "pending")
    values.putNull("ledger_transaction_id")
    values.putNull("error_code")
    values.putNull("error_message")
    values.put("created_at", createdAt)
    values.put("updated_at", createdAt)
    values.putNull("acknowledged_at")
    database.writableDatabase.insertOrThrow("recurring_movement_occurrences", null, values)
    return occurrenceId
  }

  override fun findExpectedMovementId(originOccurrenceId: String): String? =
    querySingleText(
      table = "expected_movements",
      column = "id",
      selection = "origin_occurrence_id = ?",
      selectionArgs = arrayOf(originOccurrenceId),
    )

  override fun createExpectedMovement(
    movement: RecurringMovement,
    originOccurrenceId: String,
    dueAt: String,
  ): String = expectedCore.createMovement(
    accountId = movement.sourceAccountId,
    type = movement.type.value,
    amount = movement.amount.toPlainString(),
    currency = movement.currency,
    expectedAt = dueAt,
    description = movement.description,
    merchant = movement.merchant,
    categoryId = movement.categoryId,
    originOccurrenceId = originOccurrenceId,
    originRecurringMovementId = movement.id.toString(),
    splitItemsJson = JSONArray().apply {
      movement.splitItems.forEach { item ->
        put(
          JSONObject()
            .put("id", item.id)
            .put("name", item.name)
            .put("amount", item.amount.toPlainString()),
        )
      }
    }.toString(),
  ).toString()

  override fun findExpectedOrigin(expectedMovementId: String): AndroidRecurringExpectedCoordinator.ExpectedOrigin? {
    val cursor = database.readableDatabase.query(
      "expected_movements",
      arrayOf("origin_occurrence_id", "origin_recurring_movement_id"),
      "id = ?",
      arrayOf(expectedMovementId),
      null,
      null,
      null,
      "1",
    )
    return cursor.use {
      if (!it.moveToFirst() || it.isNull(0) || it.isNull(1)) {
        null
      } else {
        AndroidRecurringExpectedCoordinator.ExpectedOrigin(
          occurrenceId = it.getString(0),
          recurringMovementId = it.getString(1),
        )
      }
    }
  }

  override fun acknowledgeOccurrence(
    occurrenceId: String,
    status: String,
    ledgerTransactionId: String?,
    errorCode: String?,
    errorMessage: String?,
    acknowledgedAt: String,
  ) {
    val values = ContentValues()
    values.put("status", status)
    values.putNullable("ledger_transaction_id", ledgerTransactionId)
    values.putNullable("error_code", errorCode)
    values.putNullable("error_message", errorMessage)
    values.put("updated_at", acknowledgedAt)
    values.put("acknowledged_at", acknowledgedAt)
    val updated = database.writableDatabase.update(
      "recurring_movement_occurrences",
      values,
      "id = ?",
      arrayOf(occurrenceId),
    )
    check(updated == 1) { "Recurring movement occurrence not found: $occurrenceId" }
  }

  private fun querySingleText(
    table: String,
    column: String,
    selection: String,
    selectionArgs: Array<String>,
  ): String? {
    val cursor = database.readableDatabase.query(
      table,
      arrayOf(column),
      selection,
      selectionArgs,
      null,
      null,
      null,
      "1",
    )
    return cursor.use { if (it.moveToFirst()) it.getString(0) else null }
  }

  private fun ContentValues.putNullable(key: String, value: String?) {
    if (value == null) {
      putNull(key)
    } else {
      put(key, value)
    }
  }
}
