package com.gonezo.presentation

import com.gonezo.application.PostExpenseCommand
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class PostExpenseE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/post_expense_setup.sql")

  @Test
  fun `posts expense and persists transaction`() {
    val command = PostExpenseCommand(
      accountId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      postedDate = LocalDate.of(2026, 2, 2),
      effectiveDate = LocalDate.of(2026, 2, 2),
      amount = Money(BigDecimal("42.75"), "USD"),
      merchant = "Corner Store",
      categoryId = null,
      recurring = false,
      reservationId = null,
    )

    val transactionId = app.postExpenseUC.execute(command)

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
    assertThat(row["type"]).isEqualTo("expense")
    assertThat(row["merchant"]).isEqualTo(command.merchant)
    assertThat(row["category_id"]).isNull()
    assertThat(row["recurring"]).isEqualTo(0)
  }
}
