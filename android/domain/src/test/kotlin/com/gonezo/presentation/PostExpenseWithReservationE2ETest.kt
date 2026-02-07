package com.gonezo.presentation

import com.gonezo.application.PostExpenseCommand
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class PostExpenseWithReservationE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/post_expense_with_reservation_setup.sql")

  @Test
  fun `posts expense and settles reservation`() {
    val reservationId = UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff")

    val command = PostExpenseCommand(
      accountId = UUID.fromString("11111111-1111-1111-1111-111111111111"),
      postedDate = LocalDate.of(2026, 2, 10),
      effectiveDate = LocalDate.of(2026, 2, 10),
      amount = Money(BigDecimal("25.00"), "USD"),
      merchant = "Electric Co",
      categoryId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"),
      recurring = false,
      reservationId = reservationId,
    )

    val transactionId = app.postExpenseUC.execute(command)

    val txRow = db.jdbcTemplate.queryForMap(
      "select account_id, posted_date, effective_date, amount, currency, type, merchant, category_id, recurring from transactions where id = ?",
      transactionId.toString(),
    )

    assertThat(txRow["account_id"].toString()).isEqualTo(command.accountId.toString())
    assertThat(txRow["posted_date"].toString()).isEqualTo(command.postedDate.toString())
    assertThat(txRow["effective_date"].toString()).isEqualTo(command.effectiveDate.toString())
    assertThat(txRow["amount"] as BigDecimal).isEqualByComparingTo(command.amount.amount)
    assertThat(txRow["currency"]).isEqualTo(command.amount.currency)
    assertThat(txRow["type"]).isEqualTo("expense")
    assertThat(txRow["merchant"]).isEqualTo(command.merchant)
    assertThat(txRow["category_id"].toString()).isEqualTo(command.categoryId.toString())
    assertThat(txRow["recurring"]).isEqualTo(0)

    val reservationRow = db.jdbcTemplate.queryForMap(
      "select status, linked_transaction_id from budget_reservations where id = ?",
      reservationId.toString(),
    )
    assertThat(reservationRow["status"]).isEqualTo("settled")
    assertThat(reservationRow["linked_transaction_id"].toString()).isEqualTo(transactionId.toString())

    val balanceRow = db.jdbcTemplate.queryForMap(
      "select spent_amount, available_amount, safe_to_spend_amount from category_balances where id = ?",
      "dddddddd-dddd-dddd-dddd-dddddddddddd",
    )
    assertThat(balanceRow["spent_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("25.00"))
    assertThat(balanceRow["available_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("75.00"))
    assertThat(balanceRow["safe_to_spend_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("75.00"))
  }
}
