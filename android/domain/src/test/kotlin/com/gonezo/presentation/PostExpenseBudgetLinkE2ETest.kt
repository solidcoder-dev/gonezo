package com.gonezo.presentation

import com.gonezo.application.PostExpenseCommand
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class PostExpenseBudgetLinkE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/post_expense_budget_link_setup.sql")

  @Test
  fun `creates budget link for categorized expense`() {
    val command = PostExpenseCommand(
      accountId = UUID.fromString("11111111-1111-1111-1111-111111111111"),
      postedDate = LocalDate.of(2026, 2, 10),
      effectiveDate = LocalDate.of(2026, 2, 10),
      amount = Money(BigDecimal("20.00"), "USD"),
      merchant = "Grocer",
      categoryId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"),
      recurring = false,
      reservationId = null,
    )

    app.postExpenseUC.execute(command)

    val count = db.jdbcTemplate.queryForObject(
      "select count(*) from budget_links",
      Int::class.java,
    )
    assertThat(count).isEqualTo(1)

    val row = db.jdbcTemplate.queryForMap(
      "select linked_type, budget_impact_amount from budget_links",
    )
    assertThat(row["linked_type"]).isEqualTo("transaction")
    assertThat(row["budget_impact_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("20.00"))
  }
}
