package com.gonezo.domain.investments.ports

import com.gonezo.domain.investments.InvestmentTransaction
import java.util.UUID

interface InvestmentTransactionRepository {
  fun save(transaction: InvestmentTransaction)
  fun listByContainer(containerId: UUID): List<InvestmentTransaction>
}
