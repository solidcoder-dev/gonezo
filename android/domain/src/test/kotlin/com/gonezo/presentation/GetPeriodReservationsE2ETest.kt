package com.gonezo.presentation

import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.UUID

class GetPeriodReservationsE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/get_period_reservations_setup.sql")

  @Test
  fun `returns active reservations for period`() {
    val periodId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc")

    val reservations = app.budgetReservationRepository.listActiveByPeriod(periodId)

    val ids = reservations.map { it.id.toString() }.toSet()
    assertThat(ids).containsExactlyInAnyOrder("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")
  }
}
