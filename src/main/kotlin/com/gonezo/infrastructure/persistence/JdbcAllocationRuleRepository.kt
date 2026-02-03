package com.gonezo.infrastructure.persistence

import com.gonezo.domain.budgeting.AllocationRule
import com.gonezo.domain.budgeting.ports.AllocationRuleRepository
import com.gonezo.domain.shared.Percent
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.math.BigDecimal
import java.sql.ResultSet
import java.util.UUID

@Repository
class JdbcAllocationRuleRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : AllocationRuleRepository {

  override fun listByPlan(planId: UUID): List<AllocationRule> {
    val sql = """
      select id, budget_plan_id, category_id, percent_of_remainder
      from allocation_rules
      where budget_plan_id = :plan_id
    """.trimIndent()

    val params = MapSqlParameterSource("plan_id", planId)
    return jdbcTemplate.query(sql, params, ruleRowMapper())
  }

  private fun ruleRowMapper(): RowMapper<AllocationRule> = RowMapper { rs: ResultSet, _ ->
    AllocationRule(
      id = UUID.fromString(rs.getString("id")),
      budgetPlanId = UUID.fromString(rs.getString("budget_plan_id")),
      categoryId = UUID.fromString(rs.getString("category_id")),
      percentOfRemainder = Percent(rs.getObject("percent_of_remainder", BigDecimal::class.java)),
    )
  }
}
