package com.gonezo.application.services

import com.gonezo.application.PostIncomeCommand
import com.gonezo.application.PostIncomeUC
import com.gonezo.domain.cashledger.ports.TransactionRepository
import com.gonezo.domain.cashledger.services.LedgerPostingService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class PostIncomeService(
  private val ledgerPostingService: LedgerPostingService,
  private val transactionRepository: TransactionRepository,
) : PostIncomeUC {

  @Transactional
  override fun execute(command: PostIncomeCommand): UUID {
    val transaction = ledgerPostingService.postIncome(
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
