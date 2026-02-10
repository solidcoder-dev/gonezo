package com.gonezo.presentation

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.util.UUID

@RestController
@RequestMapping("/budget-periods")
class BudgetLinkQueryController(
  private val jdbcTemplate: JdbcTemplate,
) {

  @GetMapping("/{periodId}/links")
  fun listLinks(@PathVariable periodId: UUID): List<BudgetLinkResponse> {
    val rows = jdbcTemplate.queryForList(
      "select id, budget_period_id, category_id, linked_type, linked_id, budget_impact_amount, budget_impact_currency from budget_links where budget_period_id = ?",
      periodId,
    )

    return rows.map { row ->
      BudgetLinkResponse(
        id = UUID.fromString(row["id"].toString()),
        budgetPeriodId = UUID.fromString(row["budget_period_id"].toString()),
        categoryId = UUID.fromString(row["category_id"].toString()),
        linkedType = row["linked_type"].toString(),
        linkedId = UUID.fromString(row["linked_id"].toString()),
        budgetImpactAmount = row["budget_impact_amount"] as BigDecimal,
        budgetImpactCurrency = row["budget_impact_currency"].toString(),
      )
    }
  }
}

data class BudgetLinkResponse(
  val id: UUID,
  val budgetPeriodId: UUID,
  val categoryId: UUID,
  val linkedType: String,
  val linkedId: UUID,
  val budgetImpactAmount: BigDecimal,
  val budgetImpactCurrency: String,
)
