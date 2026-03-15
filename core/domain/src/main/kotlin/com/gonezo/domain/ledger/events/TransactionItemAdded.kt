package com.gonezo.domain.ledger.events

import com.gonezo.domain.ledger.TransactionId
import com.gonezo.domain.ledger.TransactionItemId

data class TransactionItemAdded(
  val transactionId: TransactionId,
  val itemId: TransactionItemId,
)
