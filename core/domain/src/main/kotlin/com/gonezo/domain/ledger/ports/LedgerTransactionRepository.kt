package com.gonezo.domain.ledger.ports

import com.gonezo.domain.ledger.AccountId
import com.gonezo.domain.ledger.CategoryId
import com.gonezo.domain.ledger.DateRange
import com.gonezo.domain.ledger.Transaction
import com.gonezo.domain.ledger.TransactionId

interface LedgerTransactionRepository {
  fun save(transaction: Transaction)

  fun findById(id: TransactionId): Transaction?

  fun findByAccount(accountId: AccountId, limit: Int? = null): List<Transaction>

  fun findByAccountAndPeriod(accountId: AccountId, range: DateRange): List<Transaction>

  fun findByAccountAndCategory(accountId: AccountId, categoryId: CategoryId): List<Transaction>

  fun findByAccountAndMerchant(accountId: AccountId, merchant: String): List<Transaction>
}
