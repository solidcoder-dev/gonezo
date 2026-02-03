package com.gonezo.domain.cashledger.services

import com.gonezo.domain.cashledger.Transaction
import com.gonezo.domain.shared.Money
import java.time.LocalDate
import java.util.UUID

interface LedgerPostingService {
  fun postIncome(
    accountId: UUID,
    postedDate: LocalDate,
    effectiveDate: LocalDate,
    amount: Money,
    merchant: String?,
    categoryId: UUID?,
    recurring: Boolean,
  ): Transaction

  fun postExpense(
    accountId: UUID,
    postedDate: LocalDate,
    effectiveDate: LocalDate,
    amount: Money,
    merchant: String?,
    categoryId: UUID?,
    recurring: Boolean,
  ): Transaction

  fun postTransfer(
    fromAccountId: UUID,
    toAccountId: UUID,
    postedDate: LocalDate,
    effectiveDate: LocalDate,
    amount: Money,
  ): List<Transaction>
}
