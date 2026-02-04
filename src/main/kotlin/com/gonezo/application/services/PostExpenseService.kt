package com.gonezo.application.services

import com.gonezo.application.PostExpenseCommand
import com.gonezo.application.PostExpenseUC
import com.gonezo.application.SettleReservationFromTxCommand
import com.gonezo.application.SettleReservationFromTxUC
import com.gonezo.domain.cashledger.ports.TransactionRepository
import com.gonezo.domain.cashledger.services.LedgerPostingService
import com.gonezo.domain.budgeting.ports.CategoryRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class PostExpenseService(
  private val ledgerPostingService: LedgerPostingService,
  private val transactionRepository: TransactionRepository,
  private val settleReservationFromTxUC: SettleReservationFromTxUC,
  private val categoryBalanceUpdaterService: CategoryBalanceUpdaterService,
  private val categoryRepository: CategoryRepository,
  private val budgetAttributionService: BudgetAttributionService,
  private val reservationMatchingService: ReservationMatchingService,
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
