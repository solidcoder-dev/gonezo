package com.gonezo.infrastructure.persistence

import com.gonezo.domain.budgeting.BudgetReservation
import com.gonezo.domain.budgeting.ports.BudgetReservationRepository
import com.gonezo.domain.shared.Money
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.time.LocalDate
import java.util.UUID

@Repository
class JdbcBudgetReservationRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : BudgetReservationRepository {

  override fun get(id: UUID): BudgetReservation {
    val sql = """
      select id, budget_period_id, pattern_id, category_id, amount, currency, status, expected_effective_date, linked_transaction_id
      from budget_reservations
      where id = :id
    """.trimIndent()

    val params = MapSqlParameterSource("id", id)
    return jdbcTemplate.queryForObject(sql, params, reservationRowMapper())!!
  }

  override fun findByPeriodAndPattern(periodId: UUID, patternId: UUID): BudgetReservation? {
    val sql = """
      select id, budget_period_id, pattern_id, category_id, amount, currency, status, expected_effective_date, linked_transaction_id
      from budget_reservations
      where budget_period_id = :period_id and pattern_id = :pattern_id
      limit 1
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("period_id", periodId)
      .addValue("pattern_id", patternId)

    return jdbcTemplate.query(sql, params, reservationRowMapper()).firstOrNull()
  }

  override fun listActiveByPeriod(periodId: UUID): List<BudgetReservation> {
    val sql = """
      select id, budget_period_id, pattern_id, category_id, amount, currency, status, expected_effective_date, linked_transaction_id
      from budget_reservations
      where budget_period_id = :period_id and status = 'active'
    """.trimIndent()

    val params = MapSqlParameterSource("period_id", periodId)
    return jdbcTemplate.query(sql, params, reservationRowMapper())
  }

  override fun save(reservation: BudgetReservation) {
    val sql = """
      insert into budget_reservations (
        id, budget_period_id, pattern_id, category_id, amount, currency, status, expected_effective_date, linked_transaction_id
      ) values (
        :id, :budget_period_id, :pattern_id, :category_id, :amount, :currency, :status, :expected_effective_date, :linked_transaction_id
      )
      on conflict (id) do update set
        status = excluded.status,
        linked_transaction_id = excluded.linked_transaction_id
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", reservation.id)
      .addValue("budget_period_id", reservation.budgetPeriodId)
      .addValue("pattern_id", reservation.patternId)
      .addValue("category_id", reservation.categoryId)
      .addValue("amount", reservation.amount.amount)
      .addValue("currency", reservation.amount.currency)
      .addValue("status", reservation.status)
      .addValue("expected_effective_date", reservation.expectedEffectiveDate)
      .addValue("linked_transaction_id", reservation.linkedTransactionId)

    jdbcTemplate.update(sql, params)
  }

  private fun reservationRowMapper(): RowMapper<BudgetReservation> = RowMapper { rs: ResultSet, _ ->
    BudgetReservation(
      id = UUID.fromString(rs.getString("id")),
      budgetPeriodId = UUID.fromString(rs.getString("budget_period_id")),
      patternId = UUID.fromString(rs.getString("pattern_id")),
      categoryId = UUID.fromString(rs.getString("category_id")),
      amount = Money(
        amount = rs.getObject("amount", BigDecimal::class.java),
        currency = rs.getString("currency"),
      ),
      status = rs.getString("status"),
      expectedEffectiveDate = rs.getObject("expected_effective_date", LocalDate::class.java),
      linkedTransactionId = rs.getString("linked_transaction_id")?.let(UUID::fromString),
    )
  }
}
