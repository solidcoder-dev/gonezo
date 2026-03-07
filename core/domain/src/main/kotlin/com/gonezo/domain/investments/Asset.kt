package com.gonezo.domain.investments

import java.util.UUID

data class Asset(
  val id: UUID,
  val symbolOrName: String,
  val assetType: String,
  val currency: String,
)
