package com.gonezo.multiplatform.core

import android.content.ContentValues
import com.gonezo.application.orchestration.*
import com.gonezo.taxonomy.domain.CategoryId
import java.time.Instant
import java.util.UUID

internal class AndroidCategorizationStateRepository(private val database: CoreDatabase) : TxCategorizationStateRepository {
  override fun upsert(state: TxCategorizationState) { database.writableDatabase.insertWithOnConflict("workflow_tx_categorization", null, ContentValues().apply { put("transaction_id", state.transactionId.toString()); putNullable("requested_category_id", state.requestedCategoryId?.toString()); put("status", state.status.value); putNullable("error_code", state.errorCode); putNullable("error_message", state.errorMessage); put("attempts", state.attempts); putNullable("next_attempt_at", state.nextAttemptAt?.toString()); put("updated_at", state.updatedAt.toString()); put("created_at", state.createdAt.toString()) }, android.database.sqlite.SQLiteDatabase.CONFLICT_REPLACE) }
  override fun findByTransactionId(transactionId: UUID): TxCategorizationState? = find("transaction_id = ?", arrayOf(transactionId.toString()))
  override fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, TxCategorizationState> = transactionIds.mapNotNull { findByTransactionId(it) }.associateBy { it.transactionId }
  override fun deleteByTransactionIds(transactionIds: Collection<UUID>) { transactionIds.forEach { database.writableDatabase.delete("workflow_tx_categorization", "transaction_id = ?", arrayOf(it.toString())) } }
  override fun findPending(now: Instant, limit: Int): List<TxCategorizationState> = database.readableDatabase.query("workflow_tx_categorization", null, "status in (?, ?) and (next_attempt_at is null or next_attempt_at <= ?)", arrayOf(CategorizationStatus.PENDING.value, CategorizationStatus.FAILED.value, now.toString()), null, null, "updated_at asc", limit.toString()).use { c -> buildList { while (c.moveToNext()) add(map(c)) } }
  private fun find(where: String, args: Array<String>): TxCategorizationState? = database.readableDatabase.query("workflow_tx_categorization", null, where, args, null, null, null, "1").use { if (it.moveToFirst()) map(it) else null }
  private fun map(c: android.database.Cursor) = TxCategorizationState(UUID.fromString(c.getString(c.getColumnIndexOrThrow("transaction_id"))), c.getString(c.getColumnIndexOrThrow("requested_category_id"))?.let(CategoryId::from), CategorizationStatus.from(c.getString(c.getColumnIndexOrThrow("status"))), c.getString(c.getColumnIndexOrThrow("error_code")), c.getString(c.getColumnIndexOrThrow("error_message")), c.getInt(c.getColumnIndexOrThrow("attempts")), c.getString(c.getColumnIndexOrThrow("next_attempt_at"))?.let(Instant::parse), Instant.parse(c.getString(c.getColumnIndexOrThrow("updated_at"))), Instant.parse(c.getString(c.getColumnIndexOrThrow("created_at"))))
  private fun ContentValues.putNullable(key: String, value: String?) { if (value == null) putNull(key) else put(key, value) }
}
