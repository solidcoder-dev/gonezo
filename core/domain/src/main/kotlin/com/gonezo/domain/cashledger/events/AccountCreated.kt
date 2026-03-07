package com.gonezo.domain.cashledger.events

import java.util.UUID

data class AccountCreated(
  val accountId: UUID,
)
