package com.gonezo.presentation

import com.gonezo.application.PostExpenseCommand
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class PostExpensePostedDatePolicyE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/post_expense_posted_date_policy_setup.sql")

  @Test
  fun `uses posted date for budget attribution when policy enabled`() {
    val command = PostExpenseCommand(
      accountId = UUID.fromString("11111111-1111-1111-1111-111111111111"),
      postedDate = LocalDate.of(2026, 2, 10),
      effectiveDate = LocalDate.of(2026, 3, 5),
      amount = Money(BigDecimal("20.00"), "USD"),
      merchant = "Grocer",
      categoryId = UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd"),
      recurring = false,
      reservationId = null,
    )

    app.postExpenseUC.execute(command)

    val febRow = db.jdbcTemplate.queryForMap(
      "select spent_amount, available_amount from category_balances where id = ?",
      "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    )
    val marRow = db.jdbcTemplate.queryForMap(
      "select spent_amount, available_amount from category_balances where id = ?",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    )

    assertThat(febRow["spent_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("20.00"))
    assertThat(febRow["available_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("80.00"))
    assertThat(marRow["spent_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("0.00"))
    assertThat(marRow["available_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("100.00"))
  }
}
