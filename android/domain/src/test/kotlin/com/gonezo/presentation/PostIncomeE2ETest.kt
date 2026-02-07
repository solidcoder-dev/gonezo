package com.gonezo.presentation

import com.gonezo.application.PostIncomeCommand
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class PostIncomeE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/post_income_setup.sql")

  @Test
  fun `posts income and persists transaction`() {
    val command = PostIncomeCommand(
      budgetPlanId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      accountId = UUID.fromString("11111111-1111-1111-1111-111111111111"),
      postedDate = LocalDate.of(2026, 2, 1),
      effectiveDate = LocalDate.of(2026, 2, 1),
      amount = Money(BigDecimal("125.50"), "USD"),
      merchant = "Acme Payroll",
      categoryId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"),
      recurring = true,
    )

    val transactionId = app.postIncomeUC.execute(command)

    val row = db.jdbcTemplate.queryForMap(
      "select id, account_id, posted_date, effective_date, amount, currency, type, merchant, category_id, recurring from transactions where id = ?",
      transactionId.toString(),
    )

    assertThat(row["id"].toString()).isEqualTo(transactionId.toString())
    assertThat(row["account_id"].toString()).isEqualTo(command.accountId.toString())
    assertThat(row["posted_date"].toString()).isEqualTo(command.postedDate.toString())
    assertThat(row["effective_date"].toString()).isEqualTo(command.effectiveDate.toString())
    assertThat(row["amount"] as BigDecimal).isEqualTo(command.amount.amount)
    assertThat(row["currency"]).isEqualTo(command.amount.currency)
    assertThat(row["type"]).isEqualTo("income")
    assertThat(row["merchant"]).isEqualTo(command.merchant)
    assertThat(row["category_id"].toString()).isEqualTo(command.categoryId.toString())
    assertThat(row["recurring"]).isEqualTo(1)

    val periodRow = db.jdbcTemplate.queryForMap(
      "select income_total_amount, remainder_amount from budget_periods where id = ?",
      "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    )
    assertThat(periodRow["income_total_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("225.50"))
    assertThat(periodRow["remainder_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("150.50"))

    val balanceRow = db.jdbcTemplate.queryForMap(
      "select available_amount, safe_to_spend_amount from category_balances where id = ?",
      "dddddddd-dddd-dddd-dddd-dddddddddddd",
    )
    assertThat(balanceRow["available_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("135.50"))
    assertThat(balanceRow["safe_to_spend_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("135.50"))
  }
}
