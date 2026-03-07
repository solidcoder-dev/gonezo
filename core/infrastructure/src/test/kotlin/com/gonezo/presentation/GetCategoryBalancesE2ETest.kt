package com.gonezo.presentation

import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.util.UUID

class GetCategoryBalancesE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/get_category_balances_setup.sql")

  @Test
  fun `returns category balances for period`() {
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    val balances = app.categoryBalanceRepository.listByPeriod(periodId)

    assertThat(balances).hasSize(1)
    val balance = balances.first()

    assertThat(balance.id.toString()).isEqualTo("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")
    assertThat(balance.allocated.amount).isEqualByComparingTo(BigDecimal("50.00"))
    assertThat(balance.available.amount).isEqualByComparingTo(BigDecimal("40.00"))
  }
}
