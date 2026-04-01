package com.gonezo.ledger.domain.events

import com.gonezo.ledger.domain.AccountId

data class AccountArchived(
  val accountId: AccountId,
)
