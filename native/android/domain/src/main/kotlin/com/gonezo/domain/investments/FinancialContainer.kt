package com.gonezo.domain.investments

import java.util.UUID

data class FinancialContainer(
  val id: UUID,
  val userId: UUID,
  val name: String,
  val containerType: String,
  val currency: String,
)
