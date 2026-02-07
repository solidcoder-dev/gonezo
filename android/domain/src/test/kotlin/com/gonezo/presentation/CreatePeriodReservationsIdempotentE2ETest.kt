package com.gonezo.presentation

import com.gonezo.application.CreatePeriodReservationsCommand
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.UUID

class CreatePeriodReservationsIdempotentE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/create_period_reservations_setup.sql")

  @Test
  fun `creates reservations once per pattern`() {
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    app.createPeriodReservationsUC.execute(CreatePeriodReservationsCommand(periodId))
    app.createPeriodReservationsUC.execute(CreatePeriodReservationsCommand(periodId))

    val count = db.jdbcTemplate.queryForObject(
      "select count(*) from budget_reservations where budget_period_id = ?",
      Int::class.java,
      periodId.toString(),
    )
    assertThat(count).isEqualTo(2)
  }
}
