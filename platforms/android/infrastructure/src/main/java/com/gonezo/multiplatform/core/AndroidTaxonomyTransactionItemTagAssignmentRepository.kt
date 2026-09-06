package com.gonezo.multiplatform.core

import android.content.ContentValues
import android.database.Cursor
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TransactionItemTagAssignment
import com.gonezo.taxonomy.domain.ports.TransactionItemTagAssignmentRepository
import java.time.Instant
import java.util.UUID

internal class AndroidTaxonomyTransactionItemTagAssignmentRepository(private val db: CoreDatabase) : TransactionItemTagAssignmentRepository {
  override fun replaceByTransactionItemId(transactionItemId: UUID, assignments: List<TransactionItemTagAssignment>) {
    val database = db.writableDatabase
    database.delete("taxonomy_transaction_item_tag_assignments", "transaction_item_id = ?", arrayOf(transactionItemId.toString()))
    assignments.distinctBy { it.tagId }.forEach { assignment ->
      val result = database.insert("taxonomy_transaction_item_tag_assignments", null, ContentValues().apply {
        put("transaction_item_id", assignment.transactionItemId.toString())
        put("tag_id", assignment.tagId.toString())
        put("assigned_at", assignment.assignedAt.toString())
      })
      check(result != -1L) { "Failed to save item tag assignment" }
    }
  }

  override fun findByTransactionItemId(transactionItemId: UUID): List<TransactionItemTagAssignment> = findByIds(listOf(transactionItemId))[transactionItemId].orEmpty()

  override fun findByTransactionItemIds(transactionItemIds: Collection<UUID>): Map<UUID, List<TransactionItemTagAssignment>> = findByIds(transactionItemIds)

  override fun deleteByTransactionItemIds(transactionItemIds: Collection<UUID>) {
    if (transactionItemIds.isEmpty()) return
    val placeholders = transactionItemIds.joinToString(",") { "?" }
    db.writableDatabase.delete("taxonomy_transaction_item_tag_assignments", "transaction_item_id in ($placeholders)", transactionItemIds.map(UUID::toString).toTypedArray())
  }

  private fun findByIds(transactionItemIds: Collection<UUID>): Map<UUID, List<TransactionItemTagAssignment>> {
    if (transactionItemIds.isEmpty()) return emptyMap()
    val placeholders = transactionItemIds.joinToString(",") { "?" }
    val cursor = db.readableDatabase.query(
      "taxonomy_transaction_item_tag_assignments",
      arrayOf("transaction_item_id", "tag_id", "assigned_at"),
      "transaction_item_id in ($placeholders)",
      transactionItemIds.map(UUID::toString).toTypedArray(),
      null, null, "transaction_item_id asc, tag_id asc",
    )
    return cursor.use { mapAssignments(it).groupBy { assignment -> assignment.transactionItemId } }
  }

  private fun mapAssignments(cursor: Cursor): List<TransactionItemTagAssignment> = buildList {
    while (cursor.moveToNext()) {
      add(TransactionItemTagAssignment.assign(UUID.fromString(cursor.getString(0)), TagId.from(cursor.getString(1)), Instant.parse(cursor.getString(2))))
    }
  }
}
