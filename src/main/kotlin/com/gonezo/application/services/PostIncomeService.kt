package com.gonezo.application.services

import com.gonezo.application.PostIncomeCommand
import com.gonezo.application.PostIncomeUC
import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.domain.cashledger.events.TransactionPosted
import com.gonezo.domain.cashledger.ports.TransactionRepository
import com.gonezo.domain.cashledger.services.LedgerPostingService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class PostIncomeService(
  private val ledgerPostingService: LedgerPostingService,
  private val transactionRepository: TransactionRepository,
  private val categoryBalanceUpdaterService: CategoryBalanceUpdaterService,
  private val budgetPeriodTotalsService: BudgetPeriodTotalsService,
  private val budgetAttributionService: BudgetAttributionService,
  private val domainEventPublisher: DomainEventPublisher,
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
    domainEventPublisher.publish(TransactionPosted(transaction.id, transaction.accountId))

    val attributionDate = budgetAttributionService.resolveDate(
      planId = command.budgetPlanId,
      postedDate = transaction.postedDate,
      effectiveDate = transaction.effectiveDate,
    )

    budgetPeriodTotalsService.applyIncome(
      planId = command.budgetPlanId,
      effectiveDate = attributionDate,
      amount = transaction.amount,
    )

    transaction.categoryId?.let { categoryId ->
      categoryBalanceUpdaterService.applyIncome(
        categoryId = categoryId,
        effectiveDate = attributionDate,
        amount = transaction.amount,
      )
    }
    return transaction.id
  }
}
