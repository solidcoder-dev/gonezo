package com.gonezo.application.services
import com.gonezo.application.PostExpenseCommand
import com.gonezo.application.PostExpenseUC
import com.gonezo.application.SettleReservationFromTxCommand
import com.gonezo.application.SettleReservationFromTxUC
import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.domain.budgeting.BudgetLinkType
import com.gonezo.domain.budgeting.ports.BudgetLinkRepository
import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import com.gonezo.domain.cashledger.ports.TransactionRepository
import com.gonezo.domain.cashledger.services.LedgerPostingService
import com.gonezo.domain.cashledger.events.TransactionPosted
import com.gonezo.domain.budgeting.ports.CategoryRepository
import com.gonezo.domain.budgeting.services.BudgetLinkService
import com.gonezo.domain.shared.YearMonth
import java.util.UUID
class PostExpenseService(
  private val ledgerPostingService: LedgerPostingService,
  private val transactionRepository: TransactionRepository,
  private val settleReservationFromTxUC: SettleReservationFromTxUC,
  private val categoryBalanceUpdaterService: CategoryBalanceUpdaterService,
  private val categoryRepository: CategoryRepository,
  private val budgetPeriodRepository: BudgetPeriodRepository,
  private val budgetLinkService: BudgetLinkService,
  private val budgetLinkRepository: BudgetLinkRepository,
  private val budgetAttributionService: BudgetAttributionService,
  private val reservationMatchingService: ReservationMatchingService,
  private val domainEventPublisher: DomainEventPublisher,
) : PostExpenseUC {
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
    domainEventPublisher.publish(TransactionPosted(transaction.id, transaction.accountId))
    val categoryId = transaction.categoryId
    val planId = categoryId?.let { categoryRepository.get(it).budgetPlanId }
    val attributionDate = if (planId != null) {
      budgetAttributionService.resolveDate(
        planId = planId,
        postedDate = transaction.postedDate,
        effectiveDate = transaction.effectiveDate,
      )
    } else {
      transaction.effectiveDate
    }
    categoryId?.let {
      categoryBalanceUpdaterService.applyExpense(
        categoryId = it,
        effectiveDate = attributionDate,
        amount = transaction.amount,
      )
    }
    if (categoryId != null && planId != null) {
      val period = budgetPeriodRepository.getByYearMonth(
        planId,
        YearMonth(attributionDate.year, attributionDate.monthValue),
      )
      val link = budgetLinkService.createLink(
        budgetPeriodId = period.id,
        categoryId = categoryId,
        linkedType = BudgetLinkType.TRANSACTION,
        linkedId = transaction.id,
        budgetImpactAmount = transaction.amount,
      )
      budgetLinkRepository.save(link)
    }
    val reservationId = command.reservationId ?: run {
      if (planId == null) {
        null
      } else {
        reservationMatchingService.findMatch(
          planId = planId,
          date = attributionDate,
          categoryId = requireNotNull(categoryId),
          merchant = transaction.merchant,
          amount = transaction.amount,
        )?.id
      }
    }
    reservationId?.let {
      settleReservationFromTxUC.execute(
        SettleReservationFromTxCommand(
          reservationId = it,
          transactionId = transaction.id,
        ),
      )
    }
    return transaction.id
  }
}
