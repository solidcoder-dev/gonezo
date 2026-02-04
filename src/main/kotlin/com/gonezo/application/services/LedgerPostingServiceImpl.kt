package com.gonezo.application.services

import com.gonezo.domain.cashledger.Transaction
import com.gonezo.domain.cashledger.TransactionType
import com.gonezo.domain.cashledger.services.LedgerPostingService
import com.gonezo.domain.shared.Money
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.util.UUID

@Service
class LedgerPostingServiceImpl : LedgerPostingService {

  override fun postIncome(
    accountId: UUID,
    postedDate: LocalDate,
    effectiveDate: LocalDate,
    amount: Money,
    merchant: String?,
    categoryId: UUID?,
    recurring: Boolean,
  ): Transaction {
    return Transaction(
      id = UUID.randomUUID(),
      accountId = accountId,
      postedDate = postedDate,
      effectiveDate = effectiveDate,
      amount = amount,
      type = TransactionType.INCOME,
      merchant = merchant,
      categoryId = categoryId,
      recurring = recurring,
    )
  }

  override fun postExpense(
    accountId: UUID,
    postedDate: LocalDate,
    effectiveDate: LocalDate,
    amount: Money,
    merchant: String?,
    categoryId: UUID?,
    recurring: Boolean,
  ): Transaction {
    return Transaction(
      id = UUID.randomUUID(),
      accountId = accountId,
      postedDate = postedDate,
      effectiveDate = effectiveDate,
      amount = amount,
      type = TransactionType.EXPENSE,
      merchant = merchant,
      categoryId = categoryId,
      recurring = recurring,
    )
  }

  override fun postTransfer(
    fromAccountId: UUID,
    toAccountId: UUID,
    postedDate: LocalDate,
    effectiveDate: LocalDate,
    amount: Money,
  ): List<Transaction> {
    val out = Transaction(
      id = UUID.randomUUID(),
      accountId = fromAccountId,
      postedDate = postedDate,
      effectiveDate = effectiveDate,
      amount = amount,
      type = TransactionType.TRANSFER,
      merchant = null,
      categoryId = null,
      recurring = false,
    )

    val incoming = Transaction(
      id = UUID.randomUUID(),
      accountId = toAccountId,
      postedDate = postedDate,
      effectiveDate = effectiveDate,
      amount = amount,
      type = TransactionType.TRANSFER,
      merchant = null,
      categoryId = null,
      recurring = false,
    )

    return listOf(out, incoming)
  }
}
