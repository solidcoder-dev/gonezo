package com.gonezo.infrastructure.persistence

import com.gonezo.domain.budgeting.Category
import com.gonezo.domain.budgeting.ports.CategoryRepository
import com.gonezo.domain.shared.Money
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.util.UUID

@Repository
class JdbcCategoryRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : CategoryRepository {

  override fun listByPlan(planId: UUID): List<Category> {
    val sql = """
      select id, budget_plan_id, name, type, allow_negative, max_debt_amount, max_debt_currency
      from categories
      where budget_plan_id = :plan_id
    """.trimIndent()

    val params = MapSqlParameterSource("plan_id", planId)
    return jdbcTemplate.query(sql, params, categoryRowMapper())
  }

  private fun categoryRowMapper(): RowMapper<Category> = RowMapper { rs: ResultSet, _ ->
    val maxDebtAmount = rs.getObject("max_debt_amount", BigDecimal::class.java)
    val maxDebtCurrency = rs.getString("max_debt_currency")

    Category(
      id = UUID.fromString(rs.getString("id")),
      budgetPlanId = UUID.fromString(rs.getString("budget_plan_id")),
      name = rs.getString("name"),
      type = rs.getString("type"),
      allowNegative = rs.getBoolean("allow_negative"),
      maxDebtAmount = if (maxDebtAmount != null && maxDebtCurrency != null) {
        Money(maxDebtAmount, maxDebtCurrency)
      } else {
        null
      },
    )
  }
}
