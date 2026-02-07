package com.gonezo.presentation

import com.gonezo.application.CreatePeriodReservationsCommand
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.UUID

class CreatePeriodReservationsE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/create_period_reservations_setup.sql")

  @Test
  fun `creates reservations for active patterns`() {
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    app.createPeriodReservationsUC.execute(CreatePeriodReservationsCommand(periodId))

    val rows = db.jdbcTemplate.queryForList(
      "select pattern_id, amount, currency, status, expected_effective_date from budget_reservations where budget_period_id = ?",
      periodId.toString(),
    )

    assertThat(rows).hasSize(2)

    val byPattern = rows.associateBy { it["pattern_id"].toString() }
    val electric = byPattern["11111111-1111-1111-1111-111111111111"]!!
    val stream = byPattern["22222222-2222-2222-2222-222222222222"]!!

    assertThat(electric["amount"].toString()).isEqualTo("50.00")
    assertThat(stream["amount"].toString()).isEqualTo("15.00")
    assertThat(electric["currency"]).isEqualTo("USD")
    assertThat(stream["currency"]).isEqualTo("USD")
    assertThat(electric["status"]).isEqualTo("active")
    assertThat(stream["status"]).isEqualTo("active")
  }
}
