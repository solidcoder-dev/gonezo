package com.gonezo.presentation

import com.gonezo.application.CreateBudgetPeriodCommand
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.UUID

class CreateBudgetPeriodReservationPolicyE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/create_budget_period_reservations_policy_setup.sql")

  @Test
  fun `creates reservations at period start when policy enabled`() {
    val command = CreateBudgetPeriodCommand(
      planId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
      year = 2026,
      month = 2,
      currency = "USD",
    )

    val periodId = app.createBudgetPeriodUC.execute(command)

    val reservations = db.jdbcTemplate.queryForList(
      "select pattern_id, amount from budget_reservations where budget_period_id = ?",
      periodId.toString(),
    )
    assertThat(reservations).hasSize(2)

    val balances = db.jdbcTemplate.queryForList(
      "select reserved_amount from category_balances where budget_period_id = ?",
      periodId.toString(),
    )
    assertThat(balances).hasSize(2)
  }
}
