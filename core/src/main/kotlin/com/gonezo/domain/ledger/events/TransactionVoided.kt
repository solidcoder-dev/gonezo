package com.gonezo.ledger.domain.events

import com.gonezo.domain.shared.DomainEvent
import com.gonezo.ledger.domain.TransactionId

data class TransactionVoided(
  val transactionId: TransactionId,
) : DomainEvent
