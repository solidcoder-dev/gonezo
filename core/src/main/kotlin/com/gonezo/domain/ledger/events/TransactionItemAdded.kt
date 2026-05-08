package com.gonezo.ledger.domain.events

import com.gonezo.domain.shared.DomainEvent
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.ledger.domain.TransactionItemId

data class TransactionItemAdded(
  val transactionId: TransactionId,
  val itemId: TransactionItemId,
) : DomainEvent
