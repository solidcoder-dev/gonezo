package com.gonezo.presentation

import com.gonezo.application.SettleReservationFromTxCommand
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.UUID

class SettleReservationE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/settle_reservation_setup.sql")

  @Test
  fun `settles reservation and links transaction`() {
    val reservationId = UUID.fromString("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")
    val transactionId = UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff")

    app.settleReservationFromTxUC.execute(
      SettleReservationFromTxCommand(
        reservationId = reservationId,
        transactionId = transactionId,
      )
    )

    val row = db.jdbcTemplate.queryForMap(
      "select status, linked_transaction_id from budget_reservations where id = ?",
      reservationId.toString(),
    )

    assertThat(row["status"]).isEqualTo("settled")
    assertThat(row["linked_transaction_id"].toString()).isEqualTo(transactionId.toString())

    val balanceRow = db.jdbcTemplate.queryForMap(
      "select reserved_amount, safe_to_spend_amount from category_balances where id = ?",
      "99999999-9999-9999-9999-999999999999",
    )
    assertThat(balanceRow["reserved_amount"].toString()).isEqualTo("0.00")
    assertThat(balanceRow["safe_to_spend_amount"].toString()).isEqualTo("100.00")
  }
}
