package com.gonezo.domain.ledger.events

import com.gonezo.domain.ledger.AccountId

data class AccountOpened(
  val accountId: AccountId,
)
