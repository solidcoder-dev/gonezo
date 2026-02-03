package com.gonezo.domain.cashledger

import java.util.UUID

data class Account(
  val id: UUID,
  val userId: UUID,
  val name: String,
  val type: String,
  val currency: String,
)
