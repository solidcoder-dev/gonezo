package com.gonezo.application.services

import com.gonezo.application.PostTransferCommand
import com.gonezo.application.PostTransferUC
import com.gonezo.domain.budgeting.ports.CategoryRepository
import com.gonezo.domain.cashledger.ports.TransactionRepository
import com.gonezo.domain.cashledger.services.LedgerPostingService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class PostTransferService(
  private val ledgerPostingService: LedgerPostingService,
  private val transactionRepository: TransactionRepository,
  private val transferBudgetImpactService: TransferBudgetImpactService,
  private val categoryBalanceUpdaterService: CategoryBalanceUpdaterService,
  private val categoryRepository: CategoryRepository,
  private val budgetAttributionService: BudgetAttributionService,
) : PostTransferUC {

  @Transactional
  override fun execute(command: PostTransferCommand): List<UUID> {
    val transactions = ledgerPostingService.postTransfer(
      fromAccountId = command.fromAccountId,
      toAccountId = command.toAccountId,
      postedDate = command.postedDate,
      effectiveDate = command.effectiveDate,
      amount = command.amount,
    )

    transactions.forEach { transactionRepository.save(it) }

    val fromDate = command.fromCategoryId?.let { categoryId ->
      val planId = categoryRepository.get(categoryId).budgetPlanId
      budgetAttributionService.resolveDate(
        planId = planId,
        postedDate = command.postedDate,
        effectiveDate = command.effectiveDate,
      )
    }
    val toDate = command.toCategoryId?.let { categoryId ->
      val planId = categoryRepository.get(categoryId).budgetPlanId
      budgetAttributionService.resolveDate(
        planId = planId,
        postedDate = command.postedDate,
        effectiveDate = command.effectiveDate,
      )
    }

    transferBudgetImpactService.applyTransfer(
      fromCategoryId = command.fromCategoryId,
      toCategoryId = command.toCategoryId,
      fromEffectiveDate = fromDate,
      toEffectiveDate = toDate,
      amount = command.amount,
      categoryBalanceUpdaterService = categoryBalanceUpdaterService,
    )
    return transactions.map { it.id }
  }
}
