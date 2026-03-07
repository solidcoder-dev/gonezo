package com.gonezo.domain.investments.events

import java.util.UUID

data class InvestmentReturnRecorded(
  val investmentTransactionId: UUID,
)
