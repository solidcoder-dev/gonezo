package com.gonezo.application

import com.gonezo.domain.shared.Money
import java.time.LocalDate
import java.util.UUID

data class RecordInvestmentReturnCommand(
  val containerId: UUID,
  val date: LocalDate,
  val amount: Money,
  val note: String?,
)

interface RecordInvestmentReturnUC {
  fun execute(command: RecordInvestmentReturnCommand): UUID
}
