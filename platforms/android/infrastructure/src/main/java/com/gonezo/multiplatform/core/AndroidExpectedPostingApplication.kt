package com.gonezo.multiplatform.core

import android.content.Context
import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.application.orchestration.*
import com.gonezo.expected.application.*
import com.gonezo.ledger.application.*
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceService
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceUC
import com.gonezo.sharing.application.*
import com.gonezo.taxonomy.application.*
import java.time.Clock
import java.time.Instant

internal class AndroidExpectedPostingApplication private constructor(context: Context) {
  private val database = CoreDatabase(context.applicationContext)
  private val consistencyBoundary: ConsistencyBoundary = AndroidConsistencyBoundary(database)
  private val clock = Clock.systemUTC()
  private val eventPublisher = object : DomainEventPublisher { override fun publish(event: com.gonezo.domain.shared.DomainEvent) = Unit }
  private val accounts = AndroidLedgerAccountRepository(database)
  private val transactions = AndroidLedgerTransactionRepository(database)
  private val expected = AndroidExpectedMovementRepository(database)
  private val people = AndroidSharingPersonRepository(database)
  private val plans = AndroidRecurringSharePlanRepository(database)
  private val plannedShares = AndroidPlannedExpenseShareRepository(database)
  private val expenseShares = AndroidExpenseShareRepository(database)
  private val exclusions = AndroidAnalyticsExclusionRepository(database)
  private val categories = AndroidTaxonomyCategoryRepository(database)
  private val categoryAssignments = AndroidTaxonomyTransactionCategoryAssignmentRepository(database)
  private val tags = AndroidTaxonomyTagRepository(database)
  private val tagAssignments = AndroidTaxonomyTransactionTagAssignmentRepository(database)
  private val categorizationState = AndroidCategorizationStateRepository(database)
  private val expectedCreate: CreateExpectedMovementUC = CreateExpectedMovementService(expected)
  private val ledgerRecordExpense: RecordLedgerExpenseUC = RecordLedgerExpenseService(accounts, transactions, eventPublisher)
  private val ledgerRecordIncome: RecordLedgerIncomeUC = RecordLedgerIncomeService(accounts, transactions, eventPublisher)
  private val ledgerCreateDraft: CreateLedgerExpenseDraftUC = CreateLedgerExpenseDraftService(accounts, transactions)
  private val ledgerAddItem: AddLedgerTransactionItemUC = AddLedgerTransactionItemService(transactions, eventPublisher)
  private val ledgerPostDraft: PostLedgerDraftTransactionUC = PostLedgerDraftTransactionService(transactions, eventPublisher)
  private val taxonomyAssign = AssignCategoryToTransactionService(categories, categoryAssignments)
  private val taxonomyProcess = ProcessTransactionCategorizationService(taxonomyAssign, categorizationState)
  private val categorize: CategorizeLedgerTransactionUC = CategorizeLedgerTransactionService(categories, CreateCategoryService(categories), taxonomyProcess)
  private val applyTags: ApplyTransactionTagsUC = ApplyTransactionTagsService(tags, CreateTagService(tags), ReplaceTransactionTagsService(tags, tagAssignments))
  private val occurrenceRepository = AndroidRecurringMovementOccurrenceRepository(database)
  private val recurringRepository = AndroidRecurringMovementRepository(database)
  private val acknowledgeOccurrence: AcknowledgeRecurringMovementOccurrenceUC = AcknowledgeRecurringMovementOccurrenceService(occurrenceRepository)
  private val plannedInstantiator: PlannedShareInstantiator = DefaultPlannedShareInstantiator(plans, plannedShares, consistencyBoundary = consistencyBoundary)
  private val applyShare: ApplyShareToPostedTransactionUC = ApplyShareToPostedTransactionService(transactions, people, expenseShares, expectedCreate, exclusions, consistencyBoundary)
  private val materializeShare: MaterializePlannedShareForPostedTransactionUC = DefaultMaterializePlannedShareForPostedTransactionService(plannedShares, people, applyShare, consistencyBoundary)
  private val projection = DefaultExpectedOccurrenceProjectionService(
    recurringRepository, occurrenceRepository, expected, expectedCreate,
    plannedShareInstantiator = plannedInstantiator,
  )
  private val closeExpected = CloseExpectedAndContinueRecurrenceWorkflow(
    expected, occurrenceRepository, recurringRepository, projection, consistencyBoundary,
  )
  private val workflow = PostExpectedMovementWorkflow(
    expected, ledgerRecordExpense, ledgerRecordIncome, ledgerCreateDraft, ledgerAddItem, ledgerPostDraft,
    categorize, applyTags, MovementIgnoredWriter { id, ignored, at ->
      val values = android.content.ContentValues().apply { put("movement_id", id); put("scope", "expected_movement"); put("reason", "user_ignored"); put("created_at", at.toString()) }
      if (ignored) database.writableDatabase.insertWithOnConflict("analytics_exclusions", null, android.content.ContentValues().apply { put("id", java.util.UUID.randomUUID().toString()); put("scope_type", "expected_movement"); put("scope_id", id); put("reason", "user_ignored"); put("created_at", at.toString()) }, android.database.sqlite.SQLiteDatabase.CONFLICT_IGNORE)
      else database.writableDatabase.delete("analytics_exclusions", "scope_type = ? and scope_id = ? and reason = ?", arrayOf("expected_movement", id, "user_ignored"))
    },
    ResolveExpectedMovementService(expected), materializeShare, plannedShares, acknowledgeOccurrence, projection,
    consistencyBoundary, AndroidExpectedPostingIdempotencyRepository(database),
    TransactionIgnoredWriter { id, ignored, at ->
      if (ignored) {
        database.writableDatabase.insertWithOnConflict(
          "analytics_exclusions", null,
          android.content.ContentValues().apply {
            put("id", java.util.UUID.randomUUID().toString())
            put("scope_type", "movement")
            put("scope_id", id)
            put("reason", "user_ignored")
            put("created_at", at.toString())
          },
          android.database.sqlite.SQLiteDatabase.CONFLICT_IGNORE,
        )
      } else {
        database.writableDatabase.delete(
          "analytics_exclusions",
          "scope_type = ? and scope_id = ? and reason = ?",
          arrayOf("movement", id, "user_ignored"),
        )
      }
    },
  )

  fun execute(command: PostExpectedMovementCommand): PostExpectedMovementResult = workflow.execute(command)
  fun applyShare(command: com.gonezo.sharing.application.ApplyShareToPostedTransactionCommand): com.gonezo.sharing.application.ApplyShareToPostedTransactionResult = applyShare.execute(command)
  fun projectNext(recurringMovementId: String): String? = projection.projectNext(recurringMovementId, Instant.now(clock))?.toString()
  fun resolve(expectedMovementId: String, transactionId: String, resolvedAt: Instant) {
    closeExpected.execute(CloseExpectedAndContinueRecurrenceCommand(
      com.gonezo.expected.domain.ExpectedMovementId.from(expectedMovementId), CloseExpectedAction.RESOLVE, resolvedAt, transactionId,
    ))
  }
  fun dismiss(expectedMovementId: String, dismissedAt: Instant) {
    closeExpected.execute(CloseExpectedAndContinueRecurrenceCommand(
      com.gonezo.expected.domain.ExpectedMovementId.from(expectedMovementId), CloseExpectedAction.DISMISS, dismissedAt, null,
    ))
  }

  companion object {
    @Volatile private var instance: AndroidExpectedPostingApplication? = null
    @JvmStatic fun getInstance(context: Context): AndroidExpectedPostingApplication = instance ?: synchronized(this) { instance ?: AndroidExpectedPostingApplication(context).also { instance = it } }
  }
}
