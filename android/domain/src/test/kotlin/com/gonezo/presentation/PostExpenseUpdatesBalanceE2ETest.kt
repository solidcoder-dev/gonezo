package com.gonezo.presentation

import com.gonezo.application.PostExpenseCommand
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class PostExpenseUpdatesBalanceE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/post_expense_balance_setup.sql")

  @Test
  fun `updates category balance on expense`() {
    val command = PostExpenseCommand(
      accountId = UUID.fromString("11111111-1111-1111-1111-111111111111"),
      postedDate = LocalDate.of(2026, 2, 2),
      effectiveDate = LocalDate.of(2026, 2, 2),
      amount = Money(BigDecimal("25.00"), "USD"),
      merchant = "Market",
      categoryId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"),
      recurring = false,
      reservationId = null,
    )

    app.postExpenseUC.execute(command)

    val row = db.jdbcTemplate.queryForMap(
      "select spent_amount, available_amount, safe_to_spend_amount from category_balances where id = ?",
      "dddddddd-dddd-dddd-dddd-dddddddddddd",
    )

    assertThat(row["spent_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("35.00"))
    assertThat(row["available_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("65.00"))
    assertThat(row["safe_to_spend_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("65.00"))
  }
}
