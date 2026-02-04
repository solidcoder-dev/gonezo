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
class CategoryBalanceQueryController(
  private val jdbcTemplate: JdbcTemplate,
) {

  @GetMapping("/{periodId}/balances")
  fun listBalances(@PathVariable periodId: UUID): List<CategoryBalanceResponse> {
    val rows = jdbcTemplate.queryForList(
      "select id, budget_period_id, category_id, opening_balance_amount, opening_balance_currency, allocated_amount, allocated_currency, spent_amount, spent_currency, available_amount, available_currency, reserved_amount, reserved_currency, safe_to_spend_amount, safe_to_spend_currency from category_balances where budget_period_id = ?",
      periodId,
    )

    return rows.map { row ->
      CategoryBalanceResponse(
        id = UUID.fromString(row["id"].toString()),
        budgetPeriodId = UUID.fromString(row["budget_period_id"].toString()),
        categoryId = UUID.fromString(row["category_id"].toString()),
        openingBalanceAmount = row["opening_balance_amount"] as BigDecimal,
        openingBalanceCurrency = row["opening_balance_currency"].toString(),
        allocatedAmount = row["allocated_amount"] as BigDecimal,
        allocatedCurrency = row["allocated_currency"].toString(),
        spentAmount = row["spent_amount"] as BigDecimal,
        spentCurrency = row["spent_currency"].toString(),
        availableAmount = row["available_amount"] as BigDecimal,
        availableCurrency = row["available_currency"].toString(),
        reservedAmount = row["reserved_amount"] as BigDecimal,
        reservedCurrency = row["reserved_currency"].toString(),
        safeToSpendAmount = row["safe_to_spend_amount"] as BigDecimal,
        safeToSpendCurrency = row["safe_to_spend_currency"].toString(),
      )
    }
  }
}

data class CategoryBalanceResponse(
  val id: UUID,
  val budgetPeriodId: UUID,
  val categoryId: UUID,
  val openingBalanceAmount: BigDecimal,
  val openingBalanceCurrency: String,
  val allocatedAmount: BigDecimal,
  val allocatedCurrency: String,
  val spentAmount: BigDecimal,
  val spentCurrency: String,
  val availableAmount: BigDecimal,
  val availableCurrency: String,
  val reservedAmount: BigDecimal,
  val reservedCurrency: String,
  val safeToSpendAmount: BigDecimal,
  val safeToSpendCurrency: String,
)
