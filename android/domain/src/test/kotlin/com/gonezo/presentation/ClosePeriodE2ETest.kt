package com.gonezo.presentation

import com.gonezo.application.ClosePeriodCommand
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.UUID

class ClosePeriodE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/close_period_setup.sql")

  @Test
  fun `closes period by cancelling active reservations`() {
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    app.closePeriodUC.execute(ClosePeriodCommand(periodId))

    val rows = db.jdbcTemplate.queryForList(
      "select id, status from budget_reservations where budget_period_id = ? order by id",
      periodId.toString(),
    )

    assertThat(rows).hasSize(2)
    val byId = rows.associateBy { it["id"].toString() }

    assertThat(byId["eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"]!!["status"]).isEqualTo("cancelled")
    assertThat(byId["ffffffff-ffff-ffff-ffff-ffffffffffff"]!!["status"]).isEqualTo("settled")

    val balanceRow = db.jdbcTemplate.queryForMap(
      "select reserved_amount, safe_to_spend_amount from category_balances where id = ?",
      "99999999-9999-9999-9999-999999999999",
    )
    assertThat(balanceRow["reserved_amount"].toString()).isEqualTo("0.00")
    assertThat(balanceRow["safe_to_spend_amount"].toString()).isEqualTo("100.00")
  }
}
