package com.gonezo.application

import java.util.UUID

data class AllocateBudgetCommand(
  val periodId: UUID,
)

interface AllocateBudgetUC {
  fun execute(command: AllocateBudgetCommand)
}
