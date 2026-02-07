package com.gonezo.infrastructure.persistence

import com.gonezo.domain.budgeting.BudgetLink
import com.gonezo.domain.budgeting.ports.BudgetLinkRepository
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository

@Repository
class JdbcBudgetLinkRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : BudgetLinkRepository {

  override fun save(link: BudgetLink) {
    val sql = """
      insert into budget_links (
        id, budget_period_id, category_id, linked_type, linked_id,
        budget_impact_amount, budget_impact_currency
      ) values (
        :id, :budget_period_id, :category_id, :linked_type, :linked_id,
        :budget_impact_amount, :budget_impact_currency
      )
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", link.id)
      .addValue("budget_period_id", link.budgetPeriodId)
      .addValue("category_id", link.categoryId)
      .addValue("linked_type", link.linkedType.value)
      .addValue("linked_id", link.linkedId)
      .addValue("budget_impact_amount", link.budgetImpactAmount.amount)
      .addValue("budget_impact_currency", link.budgetImpactAmount.currency)

    jdbcTemplate.update(sql, params)
  }
}
