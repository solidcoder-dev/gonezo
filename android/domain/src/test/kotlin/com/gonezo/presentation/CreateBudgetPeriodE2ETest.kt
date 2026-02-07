package com.gonezo.presentation

import com.gonezo.application.CreateBudgetPeriodCommand
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.util.UUID

class CreateBudgetPeriodE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/create_budget_period_setup.sql")

  @Test
  fun `creates budget period with zero totals`() {
    val command = CreateBudgetPeriodCommand(
      planId = UUID.fromString("99999999-9999-9999-9999-999999999999"),
      year = 2026,
      month = 2,
      currency = "USD",
    )

    val periodId = app.createBudgetPeriodUC.execute(command)

    val row = db.jdbcTemplate.queryForMap(
      "select id, budget_plan_id, year, month, income_total_amount, income_total_currency, remainder_amount, remainder_currency from budget_periods where id = ?",
      periodId.toString(),
    )

    assertThat(row["id"].toString()).isEqualTo(periodId.toString())
    assertThat(row["budget_plan_id"].toString()).isEqualTo(command.planId.toString())
    assertThat(row["year"]).isEqualTo(command.year)
    assertThat(row["month"]).isEqualTo(command.month)
    assertThat(row["income_total_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal.ZERO)
    assertThat(row["income_total_currency"]).isEqualTo(command.currency)
    assertThat(row["remainder_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal.ZERO)
    assertThat(row["remainder_currency"]).isEqualTo(command.currency)
  }
}
