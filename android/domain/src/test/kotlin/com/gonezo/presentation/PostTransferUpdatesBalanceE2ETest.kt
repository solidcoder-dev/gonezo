package com.gonezo.presentation

import com.gonezo.application.PostTransferCommand
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class PostTransferUpdatesBalanceE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/post_transfer_balance_setup.sql")

  @Test
  fun `updates balances for transfer categories`() {
    val command = PostTransferCommand(
      fromAccountId = UUID.fromString("11111111-1111-1111-1111-111111111111"),
      toAccountId = UUID.fromString("33333333-3333-3333-3333-333333333333"),
      postedDate = LocalDate.of(2026, 2, 2),
      effectiveDate = LocalDate.of(2026, 2, 2),
      amount = Money(BigDecimal("20.00"), "USD"),
      fromCategoryId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc"),
      toCategoryId = UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd"),
    )

    app.postTransferUC.execute(command)

    val fromRow = db.jdbcTemplate.queryForMap(
      "select available_amount from category_balances where id = ?",
      "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    )
    val toRow = db.jdbcTemplate.queryForMap(
      "select available_amount from category_balances where id = ?",
      "ffffffff-ffff-ffff-ffff-ffffffffffff",
    )

    assertThat(fromRow["available_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("80.00"))
    assertThat(toRow["available_amount"] as BigDecimal).isEqualByComparingTo(BigDecimal("20.00"))
  }
}
