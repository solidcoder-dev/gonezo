package com.gonezo.presentation

import com.gonezo.application.ExecuteInvestmentCommand
import com.gonezo.domain.investments.InvestmentTransactionType
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class ExecuteInvestmentUpdatesBalanceE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/execute_investment_balance_setup.sql")

  @Test
  fun `applies budget link impact to category balance`() {
    val command = ExecuteInvestmentCommand(
      containerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      date = LocalDate.of(2026, 2, 3),
      type = InvestmentTransactionType.BUY,
      assetId = null,
      quantity = null,
      amount = Money(BigDecimal("50.00"), "USD"),
      fees = Money(BigDecimal("2.00"), "USD"),
      taxes = null,
      note = "test",
      budgetPeriodId = UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd"),
      categoryId = UUID.fromString("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
    )

    app.executeInvestmentUC.execute(command)

    val row = db.jdbcTemplate.queryForMap(
      "select available_amount, safe_to_spend_amount from category_balances where id = ?",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    )

    assertThat(row["available_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("148.00"))
    assertThat(row["safe_to_spend_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("148.00"))
  }
}
