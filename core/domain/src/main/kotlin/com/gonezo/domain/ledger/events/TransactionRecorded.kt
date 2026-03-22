package com.gonezo.ledger.domain.events

import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.TransactionId

data class TransactionRecorded(
  val transactionId: TransactionId,
  val accountId: AccountId,
)
