package com.gonezo.domain.investments.ports

import com.gonezo.domain.investments.FinancialContainer
import java.util.UUID

interface FinancialContainerRepository {
  fun get(id: UUID): FinancialContainer
}
