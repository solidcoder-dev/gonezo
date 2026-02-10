package com.gonezo.presentation

import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.util.UUID

class GetBudgetPeriodE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/get_budget_period_setup.sql")

  @Test
  fun `returns budget period details`() {
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    val period = app.budgetPeriodRepository.get(periodId)

    assertThat(period.id).isEqualTo(periodId)
    assertThat(period.budgetPlanId.toString()).isEqualTo("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    assertThat(period.yearMonth.year).isEqualTo(2026)
    assertThat(period.yearMonth.month).isEqualTo(2)
    assertThat(period.incomeTotal.amount).isEqualByComparingTo(BigDecimal("1234.56"))
    assertThat(period.incomeTotal.currency).isEqualTo("USD")
    assertThat(period.remainder.amount).isEqualByComparingTo(BigDecimal("789.01"))
    assertThat(period.remainder.currency).isEqualTo("USD")
  }
}
