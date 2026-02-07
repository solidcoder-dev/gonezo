package com.gonezo.presentation

import com.gonezo.application.PostExpenseCommand
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class PostExpenseNoReservationMatchE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/post_expense_no_match_reservation_setup.sql")

  @Test
  fun `does not match reservation when merchant does not match`() {
    val command = PostExpenseCommand(
      accountId = UUID.fromString("11111111-1111-1111-1111-111111111111"),
      postedDate = LocalDate.of(2026, 2, 10),
      effectiveDate = LocalDate.of(2026, 2, 10),
      amount = Money(BigDecimal("20.00"), "USD"),
      merchant = "Coffee Shop",
      categoryId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"),
      recurring = false,
      reservationId = null,
    )

    app.postExpenseUC.execute(command)

    val reservationRow = db.jdbcTemplate.queryForMap(
      "select status, linked_transaction_id from budget_reservations where id = ?",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    )
    assertThat(reservationRow["status"]).isEqualTo("active")
    assertThat(reservationRow["linked_transaction_id"]).isNull()

    val balanceRow = db.jdbcTemplate.queryForMap(
      "select reserved_amount, safe_to_spend_amount from category_balances where id = ?",
      "dddddddd-dddd-dddd-dddd-dddddddddddd",
    )
    assertThat(balanceRow["reserved_amount"].toString()).isEqualTo("50.00")
    assertThat(balanceRow["safe_to_spend_amount"].toString()).isEqualTo("30.00")
  }
}
