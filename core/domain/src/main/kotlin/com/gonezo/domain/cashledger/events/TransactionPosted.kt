package com.gonezo.domain.cashledger.events

import java.util.UUID

data class TransactionPosted(
  val transactionId: UUID,
  val accountId: UUID,
)
