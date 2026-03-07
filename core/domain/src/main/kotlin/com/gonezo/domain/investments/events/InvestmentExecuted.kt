package com.gonezo.domain.investments.events

import java.util.UUID

data class InvestmentExecuted(
  val investmentTransactionId: UUID,
  val containerId: UUID,
)
