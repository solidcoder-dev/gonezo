package com.gonezo.application

import java.util.UUID

data class ClosePeriodCommand(
  val periodId: UUID,
)

interface ClosePeriodUC {
  fun execute(command: ClosePeriodCommand)
}
