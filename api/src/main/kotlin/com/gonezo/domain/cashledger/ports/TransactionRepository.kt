package com.gonezo.domain.cashledger.ports

import com.gonezo.domain.cashledger.Transaction
import java.util.UUID

interface TransactionRepository {
  fun save(transaction: Transaction)
  fun listByAccount(accountId: UUID): List<Transaction>
}
