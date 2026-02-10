package com.gonezo.presentation

import com.gonezo.application.CreatePeriodReservationsCommand
import com.gonezo.testing.SqliteE2ETest
import com.gonezo.testing.decimal
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.util.UUID

class CreatePeriodReservationsBalanceE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/create_period_reservations_balance_setup.sql")

  @Test
  fun `creates reservations and updates reserved balances`() {
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    app.createPeriodReservationsUC.execute(CreatePeriodReservationsCommand(periodId))

    val utilitiesRow = db.jdbcTemplate.queryForMap(
      "select reserved_amount, safe_to_spend_amount from category_balances where id = ?",
      "99999999-9999-9999-9999-999999999999",
    )
    val subscriptionsRow = db.jdbcTemplate.queryForMap(
      "select reserved_amount, safe_to_spend_amount from category_balances where id = ?",
      "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
    )

    assertThat(decimal(utilitiesRow["reserved_amount"])).isEqualByComparingTo(BigDecimal("50.00"))
    assertThat(decimal(utilitiesRow["safe_to_spend_amount"])).isEqualByComparingTo(BigDecimal("50.00"))
    assertThat(decimal(subscriptionsRow["reserved_amount"])).isEqualByComparingTo(BigDecimal("15.00"))
    assertThat(decimal(subscriptionsRow["safe_to_spend_amount"])).isEqualByComparingTo(BigDecimal("35.00"))
  }
}
