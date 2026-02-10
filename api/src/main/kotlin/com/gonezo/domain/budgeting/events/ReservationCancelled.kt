package com.gonezo.domain.budgeting.events

import java.util.UUID

data class ReservationCancelled(
  val reservationId: UUID,
)
