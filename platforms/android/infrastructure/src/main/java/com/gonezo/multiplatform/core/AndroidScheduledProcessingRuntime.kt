package com.gonezo.multiplatform.core

import android.content.Context
import com.gonezo.application.orchestration.AutomaticDueScheduledMovementHandler
import com.gonezo.application.orchestration.ConfirmationRequiredDueScheduledMovementHandler
import com.gonezo.application.orchestration.ProcessDueScheduledMovementsCommand
import com.gonezo.application.orchestration.ProcessDueScheduledMovementsResult
import com.gonezo.application.orchestration.ProcessDueScheduledMovementsService
import com.gonezo.expected.application.CreateExpectedMovementService
import com.gonezo.sharing.application.DefaultPlannedShareInstantiator
import com.gonezo.ledger.application.RecordLedgerExpenseService
import com.gonezo.ledger.application.RecordLedgerIncomeService
import com.gonezo.ledger.application.RecordLedgerTransferFxService
import com.gonezo.ledger.application.RecordLedgerTransferService
import com.gonezo.ledger.domain.AccountId
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.time.Clock
import java.time.Instant
import java.util.UUID

class AndroidScheduledProcessingRuntime private constructor(
  private val processDueScheduledMovementsService: ProcessDueScheduledMovementsService,
) {
  fun processDue(now: Instant = Instant.now(), limit: Int = 100): ProcessDueScheduledMovementsResult =
    processDueScheduledMovementsService.execute(
      ProcessDueScheduledMovementsCommand(
        now = now,
        limit = limit,
      ),
    )

  companion object {
    @Volatile
    private var instance: AndroidScheduledProcessingRuntime? = null

    @JvmStatic
    fun getInstance(context: Context): AndroidScheduledProcessingRuntime {
      val existing = instance
      if (existing != null) {
        return existing
      }
      return synchronized(this) {
        val synchronizedExisting = instance
        if (synchronizedExisting != null) {
          synchronizedExisting
        } else {
          create(context.applicationContext).also { created -> instance = created }
        }
      }
    }

    private fun create(context: Context): AndroidScheduledProcessingRuntime {
      val database = CoreDatabase(context)
      val accountRepository = AndroidLedgerAccountRepository(database)
      val transactionRepository = AndroidLedgerTransactionRepository(database)
      val recurringMovementRepository = AndroidRecurringMovementRepository(database)
      val occurrenceRepository = AndroidRecurringMovementOccurrenceRepository(database)
      val eventPublisher = NoopDomainEventPublisher()
      val consistencyBoundary = AndroidConsistencyBoundary(database)
      val clock = Clock.systemUTC()
      val expectedRepository = AndroidExpectedMovementRepository(database)
      val plannedShares = AndroidPlannedExpenseShareRepository(database)
      val recurringPlans = AndroidRecurringSharePlanRepository(database)
      val people = AndroidSharingPersonRepository(database)

      return AndroidScheduledProcessingRuntime(
        processDueScheduledMovementsService = ProcessDueScheduledMovementsService(
          recurringMovementRepository = recurringMovementRepository,
          occurrenceRepository = occurrenceRepository,
          handlers = listOf(
            AutomaticDueScheduledMovementHandler(
              recordLedgerIncomeUC = RecordLedgerIncomeService(accountRepository, transactionRepository, eventPublisher),
              recordLedgerExpenseUC = RecordLedgerExpenseService(accountRepository, transactionRepository, eventPublisher),
              recordLedgerTransferUC = RecordLedgerTransferService(
                accountRepository,
                transactionRepository,
                eventPublisher,
                consistencyBoundary,
              ),
              recordLedgerTransferFxUC = RecordLedgerTransferFxService(
                accountRepository,
                transactionRepository,
                eventPublisher,
                consistencyBoundary,
              ),
            ),
            ConfirmationRequiredDueScheduledMovementHandler(
              createExpectedMovementUC = CreateExpectedMovementService(expectedRepository),
              expectedMovementRepository = expectedRepository,
              plannedShareInstantiator = DefaultPlannedShareInstantiator(recurringPlans, plannedShares, consistencyBoundary = consistencyBoundary),
            ),
          ),
          scheduleCalculator = RecurrenceScheduleCalculator(),
          consistencyBoundary = consistencyBoundary,
        ),
      )
    }
  }
}
