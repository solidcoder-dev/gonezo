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

class ExecuteInvestmentE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/execute_investment_setup.sql")

  @Test
  fun `executes investment and creates budget link`() {
    val command = ExecuteInvestmentCommand(
      containerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      date = LocalDate.of(2026, 2, 3),
      type = InvestmentTransactionType.BUY,
      assetId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"),
      quantity = BigDecimal("2.5"),
      amount = Money(BigDecimal("250.00"), "USD"),
      fees = Money(BigDecimal("1.50"), "USD"),
      taxes = null,
      note = "test",
      budgetPeriodId = UUID.fromString("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
      categoryId = UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff"),
    )

    val investmentId = app.executeInvestmentUC.execute(command)

    val txRow = db.jdbcTemplate.queryForMap(
      "select id, container_id, date, type, asset_id, quantity, amount, currency, fees_amount, fees_currency, note from investment_transactions where id = ?",
      investmentId.toString(),
    )

    assertThat(txRow["id"].toString()).isEqualTo(investmentId.toString())
    assertThat(txRow["container_id"].toString()).isEqualTo(command.containerId.toString())
    assertThat(txRow["date"].toString()).isEqualTo(command.date.toString())
    assertThat(txRow["type"]).isEqualTo("buy")
    assertThat(txRow["asset_id"].toString()).isEqualTo(command.assetId.toString())
    assertThat(txRow["quantity"] as BigDecimal).isEqualByComparingTo(command.quantity)
    assertThat(txRow["amount"] as BigDecimal).isEqualByComparingTo(command.amount.amount)
    assertThat(txRow["currency"]).isEqualTo("USD")
    assertThat(txRow["fees_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("1.50"))
    assertThat(txRow["fees_currency"]).isEqualTo("USD")
    assertThat(txRow["note"]).isEqualTo(command.note)

    val linkRow = db.jdbcTemplate.queryForMap(
      "select budget_period_id, category_id, linked_type, linked_id, budget_impact_amount, budget_impact_currency from budget_links where linked_id = ?",
      investmentId.toString(),
    )

    assertThat(linkRow["budget_period_id"].toString()).isEqualTo(command.budgetPeriodId.toString())
    assertThat(linkRow["category_id"].toString()).isEqualTo(command.categoryId.toString())
    assertThat(linkRow["linked_type"]).isEqualTo("investment_transaction")
    assertThat(linkRow["linked_id"].toString()).isEqualTo(investmentId.toString())
    assertThat(linkRow["budget_impact_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("251.50"))
    assertThat(linkRow["budget_impact_currency"]).isEqualTo("USD")
  }
}
