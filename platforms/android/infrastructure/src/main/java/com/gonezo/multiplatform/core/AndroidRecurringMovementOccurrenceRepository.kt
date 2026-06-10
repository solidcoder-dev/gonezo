package com.gonezo.multiplatform.core

import android.content.ContentValues
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.recurrence.domain.RecurringMovementOccurrenceStatus
import com.gonezo.recurrence.domain.ports.RecurringMovementOccurrenceRepository
import java.time.Instant
import java.util.UUID

internal class AndroidRecurringMovementOccurrenceRepository(
  private val db: CoreDatabase,
) : RecurringMovementOccurrenceRepository {
  override fun save(occurrence: RecurringMovementOccurrence) {
    val values = ContentValues()
    values.put("id", occurrence.id.toString())
    values.put("recurring_movement_id", occurrence.recurringMovementId.toString())
    values.put("due_at", occurrence.dueAt.toString())
    values.put("status", occurrence.status.value)
    values.putNullable("ledger_transaction_id", occurrence.ledgerTransactionId)
    values.putNullable("error_code", occurrence.errorCode)
    values.putNullable("error_message", occurrence.errorMessage)
    values.put("created_at", occurrence.createdAt.toString())
    values.put("updated_at", occurrence.updatedAt.toString())
    values.putNullable("acknowledged_at", occurrence.acknowledgedAt?.toString())

    val result = db.writableDatabase.insertWithOnConflict(
      "recurring_movement_occurrences",
      null,
      values,
      SQLiteDatabase.CONFLICT_REPLACE,
    )
    if (result == -1L) {
      throw IllegalStateException("Failed to upsert recurring movement occurrence: ${occurrence.id}")
    }
  }

  override fun findById(id: UUID): RecurringMovementOccurrence? {
    val cursor = db.readableDatabase.query(
      "recurring_movement_occurrences",
      COLUMNS,
      "id = ?",
      arrayOf(id.toString()),
      null,
      null,
      null,
    )
    return cursor.use { if (it.moveToFirst()) mapOccurrence(it) else null }
  }

  override fun findByRecurringMovementAndDueAt(
    recurringMovementId: RecurringMovementId,
    dueAt: Instant,
  ): RecurringMovementOccurrence? {
    val cursor = db.readableDatabase.query(
      "recurring_movement_occurrences",
      COLUMNS,
      "recurring_movement_id = ? and due_at = ?",
      arrayOf(recurringMovementId.toString(), dueAt.toString()),
      null,
      null,
      null,
      "1",
    )
    return cursor.use { if (it.moveToFirst()) mapOccurrence(it) else null }
  }

  override fun listByRecurringMovement(recurringMovementId: RecurringMovementId): List<RecurringMovementOccurrence> {
    val cursor = db.readableDatabase.query(
      "recurring_movement_occurrences",
      COLUMNS,
      "recurring_movement_id = ?",
      arrayOf(recurringMovementId.toString()),
      null,
      null,
      "due_at asc, id asc",
    )
    return cursor.use {
      val occurrences = mutableListOf<RecurringMovementOccurrence>()
      while (it.moveToNext()) {
        occurrences += mapOccurrence(it)
      }
      occurrences
    }
  }

  private fun mapOccurrence(cursor: Cursor): RecurringMovementOccurrence = RecurringMovementOccurrence(
    id = UUID.fromString(cursor.string("id")),
    recurringMovementId = RecurringMovementId.from(cursor.string("recurring_movement_id")),
    dueAt = Instant.parse(cursor.string("due_at")),
    status = RecurringMovementOccurrenceStatus.from(cursor.string("status")),
    ledgerTransactionId = cursor.stringOrNull("ledger_transaction_id"),
    errorCode = cursor.stringOrNull("error_code"),
    errorMessage = cursor.stringOrNull("error_message"),
    createdAt = Instant.parse(cursor.string("created_at")),
    updatedAt = Instant.parse(cursor.string("updated_at")),
    acknowledgedAt = cursor.stringOrNull("acknowledged_at")?.let(Instant::parse),
  )

  private fun Cursor.string(column: String): String = getString(getColumnIndexOrThrow(column))

  private fun Cursor.stringOrNull(column: String): String? {
    val index = getColumnIndexOrThrow(column)
    return if (isNull(index)) null else getString(index)
  }

  private fun ContentValues.putNullable(key: String, value: String?) {
    if (value == null) {
      putNull(key)
    } else {
      put(key, value)
    }
  }

  private companion object {
    val COLUMNS = arrayOf(
      "id",
      "recurring_movement_id",
      "due_at",
      "status",
      "ledger_transaction_id",
      "error_code",
      "error_message",
      "created_at",
      "updated_at",
      "acknowledged_at",
    )
  }
}
