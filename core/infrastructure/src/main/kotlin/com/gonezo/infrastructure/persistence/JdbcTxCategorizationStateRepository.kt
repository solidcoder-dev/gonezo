package com.gonezo.infrastructure.persistence

import com.gonezo.application.workflows.CategorizationStatus
import com.gonezo.application.workflows.TxCategorizationState
import com.gonezo.application.workflows.TxCategorizationStateRepository
import com.gonezo.domain.taxonomy.CategoryId
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant
import java.util.UUID

@Repository
class JdbcTxCategorizationStateRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : TxCategorizationStateRepository {
  override fun upsert(state: TxCategorizationState) {
    val sql = """
      insert into workflow_tx_categorization (
        transaction_id, requested_category_id, status, error_code, error_message, attempts, next_attempt_at, updated_at, created_at
      ) values (
        :transaction_id, :requested_category_id, :status, :error_code, :error_message, :attempts, :next_attempt_at, :updated_at, :created_at
      )
      on conflict(transaction_id) do update set
        requested_category_id = excluded.requested_category_id,
        status = excluded.status,
        error_code = excluded.error_code,
        error_message = excluded.error_message,
        attempts = excluded.attempts,
        next_attempt_at = excluded.next_attempt_at,
        updated_at = excluded.updated_at,
        created_at = excluded.created_at
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("transaction_id", state.transactionId.toString())
      .addValue("requested_category_id", state.requestedCategoryId?.toString())
      .addValue("status", state.status.value)
      .addValue("error_code", state.errorCode)
      .addValue("error_message", state.errorMessage)
      .addValue("attempts", state.attempts)
      .addValue("next_attempt_at", state.nextAttemptAt?.toString())
      .addValue("updated_at", state.updatedAt.toString())
      .addValue("created_at", state.createdAt.toString())

    jdbcTemplate.update(sql, params)
  }

  override fun findByTransactionId(transactionId: UUID): TxCategorizationState? {
    val sql = """
      select transaction_id, requested_category_id, status, error_code, error_message, attempts, next_attempt_at, updated_at, created_at
      from workflow_tx_categorization
      where transaction_id = :transaction_id
    """.trimIndent()
    return jdbcTemplate.query(sql, MapSqlParameterSource("transaction_id", transactionId.toString()), rowMapper()).firstOrNull()
  }

  override fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, TxCategorizationState> {
    if (transactionIds.isEmpty()) {
      return emptyMap()
    }
    val sql = """
      select transaction_id, requested_category_id, status, error_code, error_message, attempts, next_attempt_at, updated_at, created_at
      from workflow_tx_categorization
      where transaction_id in (:transaction_ids)
    """.trimIndent()
    val params = MapSqlParameterSource("transaction_ids", transactionIds.map(UUID::toString))
    return jdbcTemplate.query(sql, params, rowMapper()).associateBy { it.transactionId }
  }

  override fun findPending(now: Instant, limit: Int): List<TxCategorizationState> {
    val sql = """
      select transaction_id, requested_category_id, status, error_code, error_message, attempts, next_attempt_at, updated_at, created_at
      from workflow_tx_categorization
      where status = :pending
         or (status = :failed and (next_attempt_at is null or next_attempt_at <= :now))
      order by updated_at asc, transaction_id asc
      limit :limit
    """.trimIndent()
    val params = MapSqlParameterSource()
      .addValue("pending", CategorizationStatus.PENDING.value)
      .addValue("failed", CategorizationStatus.FAILED.value)
      .addValue("now", now.toString())
      .addValue("limit", limit)
    return jdbcTemplate.query(sql, params, rowMapper())
  }

  private fun rowMapper(): RowMapper<TxCategorizationState> = RowMapper { rs: ResultSet, _ ->
    TxCategorizationState(
      transactionId = UUID.fromString(rs.getString("transaction_id")),
      requestedCategoryId = rs.getString("requested_category_id")?.let(CategoryId::from),
      status = CategorizationStatus.from(rs.getString("status")),
      errorCode = rs.getString("error_code"),
      errorMessage = rs.getString("error_message"),
      attempts = rs.getInt("attempts"),
      nextAttemptAt = rs.getString("next_attempt_at")?.let(Instant::parse),
      updatedAt = Instant.parse(rs.getString("updated_at")),
      createdAt = Instant.parse(rs.getString("created_at")),
    )
  }
}
