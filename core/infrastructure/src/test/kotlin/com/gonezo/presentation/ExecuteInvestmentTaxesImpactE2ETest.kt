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

class ExecuteInvestmentTaxesImpactE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/execute_investment_taxes_setup.sql")

  @Test
  fun `applies taxes to budget impact`() {
    val command = ExecuteInvestmentCommand(
      containerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      date = LocalDate.of(2026, 2, 3),
      type = InvestmentTransactionType.BUY,
      assetId = null,
      quantity = null,
      amount = Money(BigDecimal("100.00"), "USD"),
      fees = Money(BigDecimal("2.00"), "USD"),
      taxes = Money(BigDecimal("3.50"), "USD"),
      note = "taxed",
      budgetPeriodId = UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd"),
      categoryId = UUID.fromString("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
    )

    val investmentId = app.executeInvestmentUC.execute(command)

    val linkRow = db.jdbcTemplate.queryForMap(
      "select budget_impact_amount from budget_links where linked_id = ?",
      investmentId.toString(),
    )
    assertThat(com.gonezo.testing.decimal(linkRow["budget_impact_amount"])).isEqualByComparingTo(BigDecimal("105.50"))

    val balanceRow = db.jdbcTemplate.queryForMap(
      "select available_amount, safe_to_spend_amount from category_balances where id = ?",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    )
    assertThat(com.gonezo.testing.decimal(balanceRow["available_amount"])).isEqualByComparingTo(BigDecimal("94.50"))
    assertThat(com.gonezo.testing.decimal(balanceRow["safe_to_spend_amount"])).isEqualByComparingTo(BigDecimal("94.50"))

    val txRow = db.jdbcTemplate.queryForMap(
      "select taxes_amount, taxes_currency from investment_transactions where id = ?",
      investmentId.toString(),
    )
    assertThat(com.gonezo.testing.decimal(txRow["taxes_amount"])).isEqualByComparingTo(BigDecimal("3.50"))
    assertThat(txRow["taxes_currency"]).isEqualTo("USD")
  }
}
