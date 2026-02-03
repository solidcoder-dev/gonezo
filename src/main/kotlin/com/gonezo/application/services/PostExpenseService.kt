package com.gonezo.application.services

import com.gonezo.application.PostExpenseCommand
import com.gonezo.application.PostExpenseUC
import com.gonezo.domain.cashledger.ports.TransactionRepository
import com.gonezo.domain.cashledger.services.LedgerPostingService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class PostExpenseService(
  private val ledgerPostingService: LedgerPostingService,
  private val transactionRepository: TransactionRepository,
) : PostExpenseUC {

  @Transactional
  override fun execute(command: PostExpenseCommand): UUID {
    val transaction = ledgerPostingService.postExpense(
      accountId = command.accountId,
      postedDate = command.postedDate,
      effectiveDate = command.effectiveDate,
      amount = command.amount,
      merchant = command.merchant,
      categoryId = command.categoryId,
      recurring = command.recurring,
    )

    transactionRepository.save(transaction)
    return transaction.id
  }
}
