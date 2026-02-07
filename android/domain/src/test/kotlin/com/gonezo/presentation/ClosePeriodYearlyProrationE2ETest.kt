package com.gonezo.presentation

import com.gonezo.application.ClosePeriodCommand
import com.gonezo.testing.SqliteE2ETest
import com.gonezo.testing.decimal
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.util.UUID

class ClosePeriodYearlyProrationE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/close_period_yearly_proration_setup.sql")

  @Test
  fun `keeps yearly proration reservations active before billing month`() {
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    app.closePeriodUC.execute(ClosePeriodCommand(periodId))

    val reservationRow = db.jdbcTemplate.queryForMap(
      "select status from budget_reservations where id = ?",
      "99999999-9999-9999-9999-999999999999",
    )
    assertThat(reservationRow["status"]).isEqualTo("active")

    val balanceRow = db.jdbcTemplate.queryForMap(
      "select reserved_amount, safe_to_spend_amount from category_balances where id = ?",
      "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    )
    assertThat(decimal(balanceRow["reserved_amount"])).isEqualByComparingTo(BigDecimal("120.00"))
    assertThat(decimal(balanceRow["safe_to_spend_amount"])).isEqualByComparingTo(BigDecimal("380.00"))
  }
}
