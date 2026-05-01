package com.gonezo.expected.infrastructure.persistence

import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ExpectedMovementType
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.time.Instant

@Repository
class JdbcExpectedMovementRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : ExpectedMovementRepository {
  override fun save(movement: ExpectedMovement) {
    val sql = """
      insert into expected_movements (
        id, account_id, movement_type, amount, currency, expected_at,
        description, merchant, category_id, status, resolved_transaction_id,
        created_at, updated_at, resolved_at, dismissed_at
      ) values (
        :id, :account_id, :movement_type, :amount, :currency, :expected_at,
        :description, :merchant, :category_id, :status, :resolved_transaction_id,
        :created_at, :updated_at, :resolved_at, :dismissed_at
      )
      on conflict(id) do update set
        account_id = excluded.account_id,
        movement_type = excluded.movement_type,
        amount = excluded.amount,
        currency = excluded.currency,
        expected_at = excluded.expected_at,
        description = excluded.description,
        merchant = excluded.merchant,
        category_id = excluded.category_id,
        status = excluded.status,
        resolved_transaction_id = excluded.resolved_transaction_id,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        resolved_at = excluded.resolved_at,
        dismissed_at = excluded.dismissed_at
    """.trimIndent()

    jdbcTemplate.update(sql, params(movement))
  }

  override fun findById(id: ExpectedMovementId): ExpectedMovement? {
    val sql = """
      select *
      from expected_movements
      where id = :id
    """.trimIndent()
    return jdbcTemplate.query(sql, MapSqlParameterSource("id", id.toString()), rowMapper()).firstOrNull()
  }

  override fun listByAccount(accountId: String, includeClosed: Boolean): List<ExpectedMovement> {
    val sql = buildString {
      append(
        """
        select *
        from expected_movements
        where account_id = :account_id
        """.trimIndent(),
      )
      if (!includeClosed) {
        append("\n  and status = :pending_status")
      }
      append("\norder by expected_at asc, id asc")
    }

    val params = MapSqlParameterSource()
      .addValue("account_id", accountId)
      .addValue("pending_status", ExpectedMovementStatus.PENDING.value)

    return jdbcTemplate.query(sql, params, rowMapper())
  }

  private fun rowMapper(): RowMapper<ExpectedMovement> = RowMapper { rs: ResultSet, _ ->
    ExpectedMovement(
      id = ExpectedMovementId.from(rs.getString("id")),
      accountId = rs.getString("account_id"),
      type = ExpectedMovementType.from(rs.getString("movement_type")),
      amount = BigDecimal(rs.getString("amount")),
      currency = rs.getString("currency"),
      expectedAt = Instant.parse(rs.getString("expected_at")),
      description = rs.getString("description"),
      merchant = rs.getString("merchant"),
      categoryId = rs.getString("category_id"),
      status = ExpectedMovementStatus.from(rs.getString("status")),
      resolvedTransactionId = rs.getString("resolved_transaction_id"),
      createdAt = Instant.parse(rs.getString("created_at")),
      updatedAt = Instant.parse(rs.getString("updated_at")),
      resolvedAt = rs.getString("resolved_at")?.let(Instant::parse),
      dismissedAt = rs.getString("dismissed_at")?.let(Instant::parse),
    )
  }

  private fun params(movement: ExpectedMovement): MapSqlParameterSource =
    MapSqlParameterSource()
      .addValue("id", movement.id.toString())
      .addValue("account_id", movement.accountId)
      .addValue("movement_type", movement.type.value)
      .addValue("amount", movement.amount.toPlainString())
      .addValue("currency", movement.currency)
      .addValue("expected_at", movement.expectedAt.toString())
      .addValue("description", movement.description)
      .addValue("merchant", movement.merchant)
      .addValue("category_id", movement.categoryId)
      .addValue("status", movement.status.value)
      .addValue("resolved_transaction_id", movement.resolvedTransactionId)
      .addValue("created_at", movement.createdAt.toString())
      .addValue("updated_at", movement.updatedAt.toString())
      .addValue("resolved_at", movement.resolvedAt?.toString())
      .addValue("dismissed_at", movement.dismissedAt?.toString())
}
