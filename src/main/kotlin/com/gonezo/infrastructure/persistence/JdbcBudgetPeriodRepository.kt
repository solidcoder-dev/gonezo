package com.gonezo.infrastructure.persistence

import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import com.gonezo.domain.shared.Money
import com.gonezo.domain.shared.YearMonth
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.util.UUID

@Repository
class JdbcBudgetPeriodRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : BudgetPeriodRepository {

  override fun get(id: UUID): BudgetPeriod {
    val sql = """
      select id, budget_plan_id, year, month,
        income_total_amount, income_total_currency,
        remainder_amount, remainder_currency
      from budget_periods
      where id = :id
    """.trimIndent()

    val params = MapSqlParameterSource("id", id)
    return jdbcTemplate.queryForObject(sql, params, periodRowMapper())!!
  }

  override fun getByYearMonth(planId: UUID, yearMonth: YearMonth): BudgetPeriod {
    val sql = """
      select id, budget_plan_id, year, month,
        income_total_amount, income_total_currency,
        remainder_amount, remainder_currency
      from budget_periods
      where budget_plan_id = :plan_id and year = :year and month = :month
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("plan_id", planId)
      .addValue("year", yearMonth.year)
      .addValue("month", yearMonth.month)

    return jdbcTemplate.queryForObject(sql, params, periodRowMapper())!!
  }

  override fun save(period: BudgetPeriod) {
    val sql = """
      insert into budget_periods (
        id, budget_plan_id, year, month,
        income_total_amount, income_total_currency,
        remainder_amount, remainder_currency
      ) values (
        :id, :budget_plan_id, :year, :month,
        :income_total_amount, :income_total_currency,
        :remainder_amount, :remainder_currency
      )
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", period.id)
      .addValue("budget_plan_id", period.budgetPlanId)
      .addValue("year", period.yearMonth.year)
      .addValue("month", period.yearMonth.month)
      .addValue("income_total_amount", period.incomeTotal.amount)
      .addValue("income_total_currency", period.incomeTotal.currency)
      .addValue("remainder_amount", period.remainder.amount)
      .addValue("remainder_currency", period.remainder.currency)

    jdbcTemplate.update(sql, params)
  }

  private fun periodRowMapper(): RowMapper<BudgetPeriod> = RowMapper { rs: ResultSet, _ ->
    BudgetPeriod(
      id = UUID.fromString(rs.getString("id")),
      budgetPlanId = UUID.fromString(rs.getString("budget_plan_id")),
      yearMonth = YearMonth(
        year = rs.getInt("year"),
        month = rs.getInt("month"),
      ),
      incomeTotal = Money(
        amount = rs.getObject("income_total_amount", BigDecimal::class.java),
        currency = rs.getString("income_total_currency"),
      ),
      remainder = Money(
        amount = rs.getObject("remainder_amount", BigDecimal::class.java),
        currency = rs.getString("remainder_currency"),
      ),
    )
  }
}
