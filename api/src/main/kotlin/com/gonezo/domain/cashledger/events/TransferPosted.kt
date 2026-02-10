package com.gonezo.domain.cashledger.events

import java.util.UUID

data class TransferPosted(
  val transferGroupId: UUID,
)
