package com.gonezo.presentation

import com.gonezo.application.PostExpenseCommand
import com.gonezo.domain.shared.Money
import com.gonezo.domain.shared.PolicyViolationException
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class PostExpenseNegativePolicyE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/post_expense_negative_policy_setup.sql")

  @Test
  fun `rejects expense that makes balance negative`() {
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

    val exception = assertThrows<PolicyViolationException> {
      app.postExpenseUC.execute(command)
    }

    assertThat(exception.message).contains("negative")

    val row = db.jdbcTemplate.queryForMap(
      "select spent_amount, available_amount from category_balances where id = ?",
      "dddddddd-dddd-dddd-dddd-dddddddddddd",
    )

    assertThat(com.gonezo.testing.decimal(row["spent_amount"])).isEqualByComparingTo(BigDecimal("0.00"))
    assertThat(com.gonezo.testing.decimal(row["available_amount"])).isEqualByComparingTo(BigDecimal("10.00"))
  }
}
