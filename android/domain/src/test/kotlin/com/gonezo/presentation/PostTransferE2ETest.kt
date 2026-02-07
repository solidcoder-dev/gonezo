package com.gonezo.presentation

import com.gonezo.application.PostTransferCommand
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

class PostTransferE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/post_transfer_setup.sql")

  @Test
  fun `posts transfer and persists two transactions`() {
    val command = PostTransferCommand(
      fromAccountId = UUID.fromString("11111111-1111-1111-1111-111111111111"),
      toAccountId = UUID.fromString("33333333-3333-3333-3333-333333333333"),
      postedDate = LocalDate.of(2026, 2, 2),
      effectiveDate = LocalDate.of(2026, 2, 2),
      amount = Money(BigDecimal("250.00"), "USD"),
      fromCategoryId = null,
      toCategoryId = null,
    )

    val ids = app.postTransferUC.execute(command)
    assertThat(ids).hasSize(2)

    val count = db.jdbcTemplate.queryForObject(
      "select count(*) from transactions where id in (?, ?)",
      Int::class.java,
      ids[0].toString(),
      ids[1].toString(),
    )
    assertThat(count).isEqualTo(2)

    val rows = db.jdbcTemplate.queryForList(
      "select account_id, posted_date, effective_date, amount, currency, type, merchant, category_id, recurring from transactions where id in (?, ?)",
      ids[0].toString(),
      ids[1].toString(),
    )

    assertThat(rows).hasSize(2)
    rows.forEach { row ->
      assertThat(row["posted_date"].toString()).isEqualTo(command.postedDate.toString())
      assertThat(row["effective_date"].toString()).isEqualTo(command.effectiveDate.toString())
      assertThat(row["amount"] as BigDecimal).isEqualTo(command.amount.amount)
      assertThat(row["currency"]).isEqualTo(command.amount.currency)
      assertThat(row["type"]).isEqualTo("transfer")
      assertThat(row["merchant"]).isNull()
      assertThat(row["category_id"]).isNull()
      assertThat(row["recurring"]).isEqualTo(0)
    }

    val accountIds = rows.map { it["account_id"].toString() }.toSet()
    assertThat(accountIds).containsExactlyInAnyOrder(
      command.fromAccountId.toString(),
      command.toAccountId.toString(),
    )
  }
}
