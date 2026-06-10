package com.gonezo.multiplatform.core

import android.content.Context
import com.gonezo.application.orchestration.AutomaticDueScheduledMovementHandler
import com.gonezo.application.orchestration.ConfirmationRequiredDueScheduledMovementHandler
import com.gonezo.application.orchestration.ProcessDueScheduledMovementsCommand
import com.gonezo.application.orchestration.ProcessDueScheduledMovementsResult
import com.gonezo.application.orchestration.ProcessDueScheduledMovementsService
import com.gonezo.expected.application.CreateExpectedMovementCommand
import com.gonezo.expected.application.CreateExpectedMovementUC
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.ledger.application.RecordLedgerExpenseService
import com.gonezo.ledger.application.RecordLedgerIncomeService
import com.gonezo.ledger.application.RecordLedgerTransferFxService
import com.gonezo.ledger.application.RecordLedgerTransferService
import com.gonezo.ledger.domain.AccountId
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.time.Clock
import java.time.Instant
import java.util.UUID
import org.json.JSONArray
import org.json.JSONObject

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
      val expectedCore = AndroidExpectedCore(
        database = database,
        accountExists = { accountId ->
          val uuid = runCatching { UUID.fromString(accountId.trim()) }.getOrNull()
          uuid != null && accountRepository.exists(AccountId(uuid))
        },
        clock = clock,
      )

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
              createExpectedMovementUC = AndroidCreateExpectedMovementUC(expectedCore),
            ),
          ),
          scheduleCalculator = RecurrenceScheduleCalculator(),
          consistencyBoundary = consistencyBoundary,
        ),
      )
    }
  }
}

private class AndroidCreateExpectedMovementUC(
  private val expectedCore: AndroidExpectedCore,
) : CreateExpectedMovementUC {
  override fun execute(command: CreateExpectedMovementCommand): ExpectedMovementId {
    val id = expectedCore.createMovement(
      accountId = command.accountId,
      type = command.type,
      amount = command.amount.toPlainString(),
      currency = command.currency,
      expectedAt = command.expectedAt.toString(),
      description = command.description,
      merchant = command.merchant,
      categoryId = command.categoryId,
      originOccurrenceId = command.originOccurrenceId,
      originRecurringMovementId = command.originRecurringMovementId,
      splitItemsJson = JSONArray().apply {
        command.splitItems.forEach { item ->
          put(
            JSONObject()
              .put("id", item.id)
              .put("name", item.name)
              .put("amount", item.amount.toPlainString()),
          )
        }
      }.toString(),
    )
    return ExpectedMovementId(id)
  }
}
