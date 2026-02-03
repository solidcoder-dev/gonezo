package com.gonezo.infrastructure.persistence

import com.gonezo.domain.budgeting.RecurringPattern
import com.gonezo.domain.budgeting.ports.RecurringPatternRepository
import com.gonezo.domain.shared.Money
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.util.UUID

@Repository
class JdbcRecurringPatternRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : RecurringPatternRepository {

  override fun listActiveByPlan(planId: UUID): List<RecurringPattern> {
    val sql = """
      select id, budget_plan_id, category_id, name, cadence,
        expected_amount, expected_currency,
        tolerance_amount, tolerance_currency,
        merchant_matcher, billing_day, billing_month, proration, active
      from recurring_patterns
      where budget_plan_id = :plan_id and active = true
    """.trimIndent()

    val params = MapSqlParameterSource("plan_id", planId)
    return jdbcTemplate.query(sql, params, patternRowMapper())
  }

  override fun save(pattern: RecurringPattern) {
    val sql = """
      insert into recurring_patterns (
        id, budget_plan_id, category_id, name, cadence,
        expected_amount, expected_currency,
        tolerance_amount, tolerance_currency,
        merchant_matcher, billing_day, billing_month, proration, active
      ) values (
        :id, :budget_plan_id, :category_id, :name, :cadence,
        :expected_amount, :expected_currency,
        :tolerance_amount, :tolerance_currency,
        :merchant_matcher, :billing_day, :billing_month, :proration, :active
      )
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", pattern.id)
      .addValue("budget_plan_id", pattern.budgetPlanId)
      .addValue("category_id", pattern.categoryId)
      .addValue("name", pattern.name)
      .addValue("cadence", pattern.cadence)
      .addValue("expected_amount", pattern.expectedAmount.amount)
      .addValue("expected_currency", pattern.expectedAmount.currency)
      .addValue("tolerance_amount", pattern.tolerance.amount)
      .addValue("tolerance_currency", pattern.tolerance.currency)
      .addValue("merchant_matcher", pattern.merchantMatcher)
      .addValue("billing_day", pattern.billingDay)
      .addValue("billing_month", pattern.billingMonth)
      .addValue("proration", pattern.proration)
      .addValue("active", pattern.active)

    jdbcTemplate.update(sql, params)
  }

  private fun patternRowMapper(): RowMapper<RecurringPattern> = RowMapper { rs: ResultSet, _ ->
    RecurringPattern(
      id = UUID.fromString(rs.getString("id")),
      budgetPlanId = UUID.fromString(rs.getString("budget_plan_id")),
      categoryId = UUID.fromString(rs.getString("category_id")),
      name = rs.getString("name"),
      cadence = rs.getString("cadence"),
      expectedAmount = Money(
        amount = rs.getObject("expected_amount", BigDecimal::class.java),
        currency = rs.getString("expected_currency"),
      ),
      tolerance = Money(
        amount = rs.getObject("tolerance_amount", BigDecimal::class.java),
        currency = rs.getString("tolerance_currency"),
      ),
      merchantMatcher = rs.getString("merchant_matcher"),
      billingDay = rs.getObject("billing_day")?.let { (it as Number).toInt() },
      billingMonth = rs.getObject("billing_month")?.let { (it as Number).toInt() },
      proration = rs.getString("proration"),
      active = rs.getBoolean("active"),
    )
  }
}
