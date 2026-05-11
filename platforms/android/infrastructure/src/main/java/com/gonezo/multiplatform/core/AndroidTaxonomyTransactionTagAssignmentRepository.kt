package com.gonezo.multiplatform.core

import android.content.ContentValues
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TransactionTagAssignment
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository
import java.time.Instant
import java.util.UUID

internal class AndroidTaxonomyTransactionTagAssignmentRepository(
  private val db: CoreDatabase,
) : TransactionTagAssignmentRepository {

  override fun replaceByTransactionId(transactionId: UUID, assignments: List<TransactionTagAssignment>) {
    val database = db.writableDatabase
    database.delete(
      "taxonomy_transaction_tag_assignments",
      "transaction_id = ?",
      arrayOf(transactionId.toString()),
    )

    assignments.forEach { assignment ->
      val values = ContentValues().apply {
        put("transaction_id", assignment.transactionId.toString())
        put("tag_id", assignment.tagId.toString())
        put("assigned_at", assignment.assignedAt.toString())
      }
      val result = database.insertWithOnConflict(
        "taxonomy_transaction_tag_assignments",
        null,
        values,
        SQLiteDatabase.CONFLICT_REPLACE,
      )
      check(result != -1L) { "Failed to upsert tag assignment for transaction: $transactionId" }
    }
  }

  override fun findByTransactionId(transactionId: UUID): List<TransactionTagAssignment> {
    val database = db.readableDatabase
    val cursor = database.query(
      "taxonomy_transaction_tag_assignments",
      arrayOf("transaction_id", "tag_id", "assigned_at"),
      "transaction_id = ?",
      arrayOf(transactionId.toString()),
      null,
      null,
      "tag_id asc",
    )
    return cursor.use(::mapAssignments)
  }

  override fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, List<TransactionTagAssignment>> {
    if (transactionIds.isEmpty()) {
      return emptyMap()
    }

    val placeholders = transactionIds.joinToString(",") { "?" }
    val args = transactionIds.map { it.toString() }.toTypedArray()
    val database = db.readableDatabase
    val cursor = database.query(
      "taxonomy_transaction_tag_assignments",
      arrayOf("transaction_id", "tag_id", "assigned_at"),
      "transaction_id in ($placeholders)",
      args,
      null,
      null,
      "transaction_id asc, tag_id asc",
    )

    return cursor.use(::mapAssignments).groupBy { it.transactionId }
  }

  private fun mapAssignments(cursor: Cursor): List<TransactionTagAssignment> =
    buildList {
      while (cursor.moveToNext()) {
        add(
          TransactionTagAssignment.assign(
            transactionId = UUID.fromString(cursor.getString(0)),
            tagId = TagId.from(cursor.getString(1)),
            assignedAt = Instant.parse(cursor.getString(2)),
          ),
        )
      }
    }
}
