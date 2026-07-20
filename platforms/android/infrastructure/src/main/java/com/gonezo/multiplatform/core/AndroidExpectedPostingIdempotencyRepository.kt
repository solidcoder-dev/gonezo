package com.gonezo.multiplatform.core

import android.content.ContentValues
import com.gonezo.application.orchestration.ExpectedPostingIdempotencyRepository
import com.gonezo.application.orchestration.PostExpectedMovementResult
import com.gonezo.application.orchestration.ProcessedExpectedPosting
import java.time.Instant

internal class AndroidExpectedPostingIdempotencyRepository(private val database: CoreDatabase) : ExpectedPostingIdempotencyRepository {
  override fun findByKey(idempotencyKey: String): ProcessedExpectedPosting? {
    val cursor = database.readableDatabase.query("expected_posting_attempts", null, "idempotency_key = ?", arrayOf(idempotencyKey), null, null, null, "1")
    return cursor.use {
      if (!it.moveToFirst()) return null
      ProcessedExpectedPosting(
        idempotencyKey, it.getString(it.getColumnIndexOrThrow("expected_movement_id")),
        PostExpectedMovementResult(it.getString(it.getColumnIndexOrThrow("transaction_id")), it.getString(it.getColumnIndexOrThrow("share_id")), it.getString(it.getColumnIndexOrThrow("next_expected_movement_id"))),
        it.getString(it.getColumnIndexOrThrow("completion_status")),
      )
    }
  }

  override fun findByExpectedMovementId(expectedMovementId: String): ProcessedExpectedPosting? {
    val cursor = database.readableDatabase.query("expected_posting_attempts", null, "expected_movement_id = ? and completion_status = ?", arrayOf(expectedMovementId, "completed"), null, null, null, "1")
    return cursor.use {
      if (!it.moveToFirst()) return null
      ProcessedExpectedPosting(
        it.getString(it.getColumnIndexOrThrow("idempotency_key")), expectedMovementId,
        PostExpectedMovementResult(it.getString(it.getColumnIndexOrThrow("transaction_id")), it.getString(it.getColumnIndexOrThrow("share_id")), it.getString(it.getColumnIndexOrThrow("next_expected_movement_id"))),
        it.getString(it.getColumnIndexOrThrow("completion_status")),
      )
    }
  }

  override fun save(processed: ProcessedExpectedPosting) {
    database.writableDatabase.insertOrThrow("expected_posting_attempts", null, ContentValues().apply {
      put("idempotency_key", processed.idempotencyKey); put("expected_movement_id", processed.expectedMovementId)
      put("transaction_id", processed.result.transactionId); putNullable("share_id", processed.result.shareId)
      putNullable("next_expected_movement_id", processed.result.nextExpectedMovementId)
      put("completed_at", Instant.now().toString()); put("completion_status", processed.completionStatus)
    })
  }

  private fun ContentValues.putNullable(key: String, value: String?) { if (value == null) putNull(key) else put(key, value) }
}
