package com.gonezo.application.services

import com.gonezo.application.PostExpenseCommand
import com.gonezo.application.PostExpenseUC
import com.gonezo.application.SettleReservationFromTxCommand
import com.gonezo.application.SettleReservationFromTxUC
import com.gonezo.domain.cashledger.ports.TransactionRepository
import com.gonezo.domain.cashledger.services.LedgerPostingService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class PostExpenseService(
  private val ledgerPostingService: LedgerPostingService,
  private val transactionRepository: TransactionRepository,
  private val settleReservationFromTxUC: SettleReservationFromTxUC,
  private val categoryBalanceUpdaterService: CategoryBalanceUpdaterService,
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

    transaction.categoryId?.let { categoryId ->
      categoryBalanceUpdaterService.applyExpense(
        categoryId = categoryId,
        effectiveDate = transaction.effectiveDate,
        amount = transaction.amount,
      )
    }

    command.reservationId?.let { reservationId ->
      settleReservationFromTxUC.execute(
        SettleReservationFromTxCommand(
          reservationId = reservationId,
          transactionId = transaction.id,
        ),
      )
    }

    return transaction.id
  }
}
