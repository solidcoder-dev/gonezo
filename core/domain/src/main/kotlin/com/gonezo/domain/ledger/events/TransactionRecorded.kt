package com.gonezo.domain.ledger.events

import com.gonezo.domain.ledger.AccountId
import com.gonezo.domain.ledger.TransactionId

data class TransactionRecorded(
  val transactionId: TransactionId,
  val accountId: AccountId,
)
