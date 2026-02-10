package com.gonezo.presentation

import com.gonezo.application.AllocateBudgetCommand
import com.gonezo.domain.shared.PolicyViolationException
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.util.UUID

class AllocateBudgetInvariantE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/allocate_budget_invariant_setup.sql")

  @Test
  fun `rejects allocation when percentages do not sum to one`() {
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    val exception = assertThrows<PolicyViolationException> {
      app.allocateBudgetUC.execute(AllocateBudgetCommand(periodId))
    }

    assertThat(exception.message).contains("sum to 1.0")

    val count = db.jdbcTemplate.queryForObject(
      "select count(*) from category_balances where budget_period_id = ?",
      Int::class.java,
      periodId.toString(),
    )
    assertThat(count).isEqualTo(0)
  }
}
