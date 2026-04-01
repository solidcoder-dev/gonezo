package com.gonezo.ledger.domain.events

import com.gonezo.ledger.domain.TransactionId

data class TransactionVoided(
  val transactionId: TransactionId,
)
