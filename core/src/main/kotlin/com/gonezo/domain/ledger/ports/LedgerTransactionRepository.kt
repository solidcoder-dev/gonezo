package com.gonezo.ledger.domain.ports

import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.DateRange
import com.gonezo.ledger.domain.Transaction
import com.gonezo.ledger.domain.TransactionId

interface LedgerTransactionRepository {
  fun save(transaction: Transaction)

  fun findById(id: TransactionId): Transaction?

  fun findByAccount(accountId: AccountId, limit: Int? = null): List<Transaction>

  fun findByAccountAndPeriod(accountId: AccountId, range: DateRange): List<Transaction>

  fun findByAccountAndMerchant(accountId: AccountId, merchant: String): List<Transaction>
}
