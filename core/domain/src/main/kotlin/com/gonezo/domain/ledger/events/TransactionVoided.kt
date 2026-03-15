package com.gonezo.domain.ledger.events

import com.gonezo.domain.ledger.TransactionId

data class TransactionVoided(
  val transactionId: TransactionId,
)
