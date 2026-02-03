package com.gonezo.application

import java.util.UUID

data class CreateBudgetPeriodCommand(
  val planId: UUID,
  val year: Int,
  val month: Int,
  val currency: String,
)

interface CreateBudgetPeriodUC {
  fun execute(command: CreateBudgetPeriodCommand): UUID
}
