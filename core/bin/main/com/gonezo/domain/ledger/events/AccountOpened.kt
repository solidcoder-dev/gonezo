package com.gonezo.ledger.domain.events

import com.gonezo.ledger.domain.AccountId

data class AccountOpened(
  val accountId: AccountId,
)
