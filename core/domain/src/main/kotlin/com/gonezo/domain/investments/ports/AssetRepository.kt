package com.gonezo.domain.investments.ports

import com.gonezo.domain.investments.Asset
import java.util.UUID

interface AssetRepository {
  fun get(id: UUID): Asset
}
