package com.gonezo.presentation

import com.gonezo.application.AllocateBudgetCommand
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.util.UUID

class AllocateBudgetE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/allocate_budget_setup.sql")

  @Test
  fun `allocates remainder across categories`() {
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    app.allocateBudgetUC.execute(AllocateBudgetCommand(periodId))

    val rows = db.jdbcTemplate.queryForList(
      "select category_id, allocated_amount, allocated_currency, available_amount, reserved_amount, safe_to_spend_amount from category_balances where budget_period_id = ?",
      periodId.toString(),
    )

    assertThat(rows).hasSize(2)

    val byCategory = rows.associateBy { it["category_id"].toString() }
    val groceries = byCategory["dddddddd-dddd-dddd-dddd-dddddddddddd"]!!
    val rent = byCategory["eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"]!!

    assertThat(com.gonezo.testing.decimal(groceries["allocated_amount"])).isEqualByComparingTo(BigDecimal("60.00"))
    assertThat(com.gonezo.testing.decimal(rent["allocated_amount"])).isEqualByComparingTo(BigDecimal("40.00"))

    listOf(groceries, rent).forEach { row ->
      assertThat(row["allocated_currency"]).isEqualTo("USD")
      assertThat(com.gonezo.testing.decimal(row["available_amount"])).isEqualByComparingTo(com.gonezo.testing.decimal(row["allocated_amount"]))
      assertThat(com.gonezo.testing.decimal(row["reserved_amount"])).isEqualByComparingTo(BigDecimal.ZERO)
      assertThat(com.gonezo.testing.decimal(row["safe_to_spend_amount"])).isEqualByComparingTo(com.gonezo.testing.decimal(row["allocated_amount"]))
    }
  }
}
