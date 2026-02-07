package com.gonezo.presentation

import com.gonezo.application.PostExpenseCommand
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class PostExpenseMatchesReservationE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/post_expense_match_reservation_setup.sql")

  @Test
  fun `matches reservation by merchant and tolerance`() {
    val command = PostExpenseCommand(
      accountId = UUID.fromString("11111111-1111-1111-1111-111111111111"),
      postedDate = LocalDate.of(2026, 2, 10),
      effectiveDate = LocalDate.of(2026, 2, 10),
      amount = Money(BigDecimal("52.00"), "USD"),
      merchant = "Electric Co",
      categoryId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"),
      recurring = false,
      reservationId = null,
    )

    val transactionId = app.postExpenseUC.execute(command)

    val reservationRow = db.jdbcTemplate.queryForMap(
      "select status, linked_transaction_id from budget_reservations where id = ?",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    )
    assertThat(reservationRow["status"]).isEqualTo("settled")
    assertThat(reservationRow["linked_transaction_id"].toString()).isEqualTo(transactionId.toString())

    val balanceRow = db.jdbcTemplate.queryForMap(
      "select reserved_amount, safe_to_spend_amount from category_balances where id = ?",
      "dddddddd-dddd-dddd-dddd-dddddddddddd",
    )
    assertThat(balanceRow["reserved_amount"].toString()).isEqualTo("0.00")
    assertThat(balanceRow["safe_to_spend_amount"].toString()).isEqualTo("48.00")
  }
}
