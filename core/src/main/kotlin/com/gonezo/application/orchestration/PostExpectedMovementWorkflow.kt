package com.gonezo.application.orchestration

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.expected.application.ResolveExpectedMovementCommand
import com.gonezo.expected.application.ResolveExpectedMovementUC
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ExpectedMovementType
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import com.gonezo.ledger.application.AddLedgerTransactionItemCommand
import com.gonezo.ledger.application.AddLedgerTransactionItemUC
import com.gonezo.ledger.application.CreateLedgerExpenseDraftCommand
import com.gonezo.ledger.application.CreateLedgerExpenseDraftUC
import com.gonezo.ledger.application.PostLedgerDraftTransactionCommand
import com.gonezo.ledger.application.PostLedgerDraftTransactionUC
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.application.RecordLedgerExpenseUC
import com.gonezo.ledger.application.RecordLedgerIncomeCommand
import com.gonezo.ledger.application.RecordLedgerIncomeUC
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.sharing.application.*
import com.gonezo.sharing.domain.ExpectedMovementRef
import com.gonezo.sharing.domain.ports.PlannedExpenseShareRepository
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceCommand
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceStatus
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceUC
import java.time.Instant
import java.util.UUID

data class PostExpectedMovementCommand(
  val expectedMovementId: String,
  val occurredAt: Instant,
  val categoryId: String? = null,
  val tagNames: List<String> = emptyList(),
  val ignored: Boolean = false,
  val sharingOverride: FinalPlannedShareDraft? = null,
  val idempotencyKey: String,
)

data class PostExpectedMovementResult(
  val transactionId: String,
  val shareId: String? = null,
  val nextExpectedMovementId: String? = null,
)

fun interface MovementIgnoredWriter {
  fun setIgnored(movementId: String, ignored: Boolean, changedAt: Instant)
}

data class ProcessedExpectedPosting(
  val idempotencyKey: String,
  val expectedMovementId: String,
  val result: PostExpectedMovementResult,
  val completionStatus: String = "completed",
)

interface ExpectedPostingIdempotencyRepository {
  fun findByKey(idempotencyKey: String): ProcessedExpectedPosting?
  fun findByExpectedMovementId(expectedMovementId: String): ProcessedExpectedPosting? = null
  fun save(processed: ProcessedExpectedPosting)
}

fun interface TransactionIgnoredWriter {
  fun setIgnored(transactionId: String, ignored: Boolean, changedAt: Instant)
}

class PostExpectedMovementWorkflow(
  private val expectedMovements: ExpectedMovementRepository,
  private val recordExpense: RecordLedgerExpenseUC,
  private val recordIncome: RecordLedgerIncomeUC,
  private val createExpenseDraft: CreateLedgerExpenseDraftUC,
  private val addItem: AddLedgerTransactionItemUC,
  private val postDraft: PostLedgerDraftTransactionUC,
  private val categorize: CategorizeLedgerTransactionUC,
  private val applyTags: ApplyTransactionTagsUC,
  private val ignoredWriter: MovementIgnoredWriter,
  private val resolveExpected: ResolveExpectedMovementUC,
  private val materializeShare: MaterializePlannedShareForPostedTransactionUC,
  private val plannedShares: PlannedExpenseShareRepository,
  private val acknowledgeOccurrence: AcknowledgeRecurringMovementOccurrenceUC,
  private val projectNext: ExpectedOccurrenceProjectionService,
  private val consistencyBoundary: ConsistencyBoundary,
  private val idempotency: ExpectedPostingIdempotencyRepository,
  private val transactionIgnoredWriter: TransactionIgnoredWriter = TransactionIgnoredWriter { _, _, _ -> },
) {
  fun execute(command: PostExpectedMovementCommand): PostExpectedMovementResult = consistencyBoundary.withinConsistencyBoundary {
    require(command.idempotencyKey.isNotBlank()) { "idempotencyKey is required" }
    idempotency.findByKey(command.idempotencyKey)?.let { processed ->
      require(processed.expectedMovementId == command.expectedMovementId) { "idempotencyKey belongs to another expected movement" }
      return@withinConsistencyBoundary processed.result
    }
    val expectedId = com.gonezo.expected.domain.ExpectedMovementId.from(command.expectedMovementId)
    val expected = expectedMovements.findById(expectedId) ?: error("Expected movement not found: ${command.expectedMovementId}")
    if (expected.status == ExpectedMovementStatus.RESOLVED) {
      val previous = idempotency.findByExpectedMovementId(command.expectedMovementId)
      val resolvedResult = PostExpectedMovementResult(
        transactionId = previous?.result?.transactionId ?: expected.resolvedTransactionId!!,
        shareId = plannedShares.findByExpectedMovementRef(ExpectedMovementRef(command.expectedMovementId))
          ?.materializedShareId
          ?.toString(),
        nextExpectedMovementId = previous?.result?.nextExpectedMovementId,
      )
      return@withinConsistencyBoundary resolvedResult.also {
        idempotency.save(ProcessedExpectedPosting(command.idempotencyKey, command.expectedMovementId, it))
      }
    }
    check(expected.status == ExpectedMovementStatus.PENDING) { "Only pending expected movements can be posted" }
    val transactionId = post(expected, command.occurredAt)
    categorize.execute(CategorizeLedgerTransactionCommand(TransactionId.from(transactionId), expected.type.value, (command.categoryId ?: expected.categoryId)?.let(CategoryId::from), requestedAt = command.occurredAt))
    applyTags.execute(ApplyTransactionTagsCommand(TransactionId.from(transactionId), if (command.tagNames.isEmpty()) expected.tagNames else command.tagNames, command.occurredAt))
    ignoredWriter.setIgnored(command.expectedMovementId, command.ignored, command.occurredAt)
    transactionIgnoredWriter.setIgnored(transactionId, command.ignored, command.occurredAt)
    val planned = plannedShares.findByExpectedMovementRef(ExpectedMovementRef(command.expectedMovementId))
    val shareId = if (command.sharingOverride != null || planned != null) {
      materializeShare.execute(MaterializePlannedShareCommand(command.expectedMovementId, transactionId, command.occurredAt, command.sharingOverride))
    } else null
    resolveExpected.execute(ResolveExpectedMovementCommand(expectedId, transactionId, command.occurredAt))
    val occurrenceId = expected.originOccurrenceId?.let(UUID::fromString)
    val nextExpectedMovementId = if (occurrenceId != null) {
      acknowledgeOccurrence.execute(AcknowledgeRecurringMovementOccurrenceCommand(occurrenceId, AcknowledgeRecurringMovementOccurrenceStatus.POSTED, transactionId, null, null, command.occurredAt))
      projectNext.projectNext(expected.originRecurringMovementId!!, command.occurredAt)?.toString()
    } else null
    PostExpectedMovementResult(transactionId, shareId, nextExpectedMovementId).also {
      idempotency.save(ProcessedExpectedPosting(command.idempotencyKey, command.expectedMovementId, it))
    }
  }

  private fun post(expected: com.gonezo.expected.domain.ExpectedMovement, at: Instant): String {
    val account = AccountId.from(expected.accountId)
    val money = com.gonezo.domain.shared.Money(expected.amount, expected.currency)
    if (expected.type == ExpectedMovementType.EXPENSE && expected.splitItems.isNotEmpty()) {
      val draft = createExpenseDraft.execute(CreateLedgerExpenseDraftCommand(account, money, at, expected.description, expected.merchant))
      expected.splitItems.forEach { item -> addItem.execute(AddLedgerTransactionItemCommand(draft, item.name, com.gonezo.domain.shared.Money(item.amount, expected.currency), null)) }
      postDraft.execute(PostLedgerDraftTransactionCommand(draft))
      return draft.toString()
    }
    return when (expected.type) {
      ExpectedMovementType.EXPENSE -> recordExpense.execute(RecordLedgerExpenseCommand(account, money, at, expected.description, expected.merchant)).toString()
      ExpectedMovementType.INCOME -> recordIncome.execute(RecordLedgerIncomeCommand(account, money, at, expected.description, expected.merchant)).toString()
    }
  }
}
