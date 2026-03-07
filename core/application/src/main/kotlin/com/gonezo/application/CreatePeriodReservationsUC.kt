package com.gonezo.application

import java.util.UUID

data class CreatePeriodReservationsCommand(
  val periodId: UUID,
)

interface CreatePeriodReservationsUC {
  fun execute(command: CreatePeriodReservationsCommand)
}
