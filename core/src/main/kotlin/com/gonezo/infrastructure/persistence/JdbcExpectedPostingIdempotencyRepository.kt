package com.gonezo.infrastructure.persistence

import com.gonezo.application.orchestration.ExpectedPostingIdempotencyRepository
import com.gonezo.application.orchestration.PostExpectedMovementResult
import com.gonezo.application.orchestration.ProcessedExpectedPosting
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate

class JdbcExpectedPostingIdempotencyRepository(
  private val jdbc: NamedParameterJdbcTemplate,
) : ExpectedPostingIdempotencyRepository {
  override fun findByKey(idempotencyKey: String): ProcessedExpectedPosting? = jdbc.query(
    """
      select idempotency_key, expected_movement_id, transaction_id, share_id, next_expected_movement_id, completion_status
      from expected_posting_attempts
      where idempotency_key = :key
      limit 1
    """.trimIndent(),
    MapSqlParameterSource("key", idempotencyKey),
  ) { rs, _ ->
    ProcessedExpectedPosting(
      idempotencyKey = rs.getString("idempotency_key"),
      expectedMovementId = rs.getString("expected_movement_id"),
      result = PostExpectedMovementResult(rs.getString("transaction_id"), rs.getString("share_id"), rs.getString("next_expected_movement_id")),
      completionStatus = rs.getString("completion_status"),
    )
  }.firstOrNull()

  override fun findByExpectedMovementId(expectedMovementId: String): ProcessedExpectedPosting? = jdbc.query(
    """
      select idempotency_key, expected_movement_id, transaction_id, share_id, next_expected_movement_id, completion_status
      from expected_posting_attempts
      where expected_movement_id = :expected and completion_status = 'completed'
      limit 1
    """.trimIndent(),
    MapSqlParameterSource("expected", expectedMovementId),
  ) { rs, _ ->
    ProcessedExpectedPosting(
      idempotencyKey = rs.getString("idempotency_key"),
      expectedMovementId = rs.getString("expected_movement_id"),
      result = PostExpectedMovementResult(rs.getString("transaction_id"), rs.getString("share_id"), rs.getString("next_expected_movement_id")),
      completionStatus = rs.getString("completion_status"),
    )
  }.firstOrNull()

  override fun save(processed: ProcessedExpectedPosting) {
    jdbc.update(
      """
        insert into expected_posting_attempts(
          idempotency_key, expected_movement_id, transaction_id, share_id, next_expected_movement_id, completed_at, completion_status
        ) values (:key, :expected, :transaction, :share, :next_expected, :completed, :status)
      """.trimIndent(),
      MapSqlParameterSource()
        .addValue("key", processed.idempotencyKey)
        .addValue("expected", processed.expectedMovementId)
        .addValue("transaction", processed.result.transactionId)
        .addValue("share", processed.result.shareId)
        .addValue("next_expected", processed.result.nextExpectedMovementId)
        .addValue("completed", java.time.Instant.now().toString())
        .addValue("status", processed.completionStatus),
    )
  }
}
