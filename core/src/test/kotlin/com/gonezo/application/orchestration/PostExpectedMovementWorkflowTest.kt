package com.gonezo.application.orchestration

import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.expected.application.ResolveExpectedMovementCommand
import com.gonezo.expected.application.ResolveExpectedMovementUC
import com.gonezo.ledger.application.*
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceCommand
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceUC
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ExpectedMovementType
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.domain.shared.Money
import com.gonezo.sharing.application.*
import com.gonezo.sharing.domain.ExpectedMovementRef
import com.gonezo.sharing.domain.PlannedExpenseShare
import com.gonezo.sharing.domain.PlannedExpenseShareId
import com.gonezo.sharing.domain.ports.PlannedExpenseShareRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class PostExpectedMovementWorkflowTest {
  @Test
  fun `posts an independent expected exactly once and is idempotent`() {
    val fixture = fixture()
    val expected = fixture.expected(ExpectedMovementType.EXPENSE)
    val command = PostExpectedMovementCommand(expected.id.toString(), expected.toPostingSnapshot(), Instant.parse("2026-07-21T10:00:00Z"), idempotencyKey = "post-1")

    val first = fixture.workflow.execute(command)
    val second = fixture.workflow.execute(command)

    assertThat(first.transactionId).isEqualTo(second.transactionId)
    assertThat(fixture.recordedTransactions).hasSize(1)
    assertThat(fixture.recordExpenseCommands).hasSize(1)
    assertThat(fixture.acknowledgedOccurrences).isEmpty()
    assertThat(fixture.repository.findById(expected.id)!!.status).isEqualTo(ExpectedMovementStatus.RESOLVED)
    assertThat(first.nextExpectedMovementId).isNull()
  }

  @Test
  fun `posts a simple expense from the final snapshot`() {
    val fixture = fixture()
    val expected = fixture.expected(ExpectedMovementType.EXPENSE)
    val finalAccount = UUID.randomUUID().toString()
    val command = PostExpectedMovementCommand(
      expectedMovementId = expected.id.toString(),
      movement = ExpectedPostingMovementSnapshot(finalAccount, ExpectedMovementType.EXPENSE, BigDecimal("50.00"), "GBP", "Actual final", "Actual final", emptyList()),
      occurredAt = Instant.parse("2026-07-21T11:00:00Z"),
      idempotencyKey = "post-final-expense",
    )

    fixture.workflow.execute(command)

    val recorded = fixture.recordExpenseCommands.single()
    assertThat(recorded.accountId.value.toString()).isEqualTo(finalAccount)
    assertThat(recorded.amount.amount).isEqualByComparingTo("50.00")
    assertThat(recorded.amount.currency).isEqualTo("GBP")
    assertThat(recorded.description).isEqualTo("Actual final")
    assertThat(recorded.merchant).isEqualTo("Actual final")
    assertThat(fixture.repository.findById(expected.id)!!.status).isEqualTo(ExpectedMovementStatus.RESOLVED)
  }

  @Test
  fun `posts detailed expense using only final items and currency`() {
    val fixture = fixture()
    val expected = fixture.expected(
      ExpectedMovementType.EXPENSE,
      splitItems = listOf(ExpectedMovement.SplitItem("original-item", "Original", BigDecimal("12.00"))),
    )
    val command = PostExpectedMovementCommand(
      expected.id.toString(),
      ExpectedPostingMovementSnapshot(
        UUID.randomUUID().toString(), ExpectedMovementType.EXPENSE, BigDecimal("50.00"), "GBP", "Actual final", "Actual final",
        listOf(ExpectedPostingSplitItem("final-a", "Final A", BigDecimal("30.00")), ExpectedPostingSplitItem("final-b", "Final B", BigDecimal("20.00"))),
      ),
      Instant.parse("2026-07-21T11:00:00Z"),
      idempotencyKey = "post-final-detailed",
    )

    fixture.workflow.execute(command)

    assertThat(fixture.draftCommands.single().accountId.value.toString()).isEqualTo(command.movement.accountId)
    assertThat(fixture.draftCommands.single().amount.amount).isEqualByComparingTo("50.00")
    assertThat(fixture.draftCommands.single().amount.currency).isEqualTo("GBP")
    assertThat(fixture.draftCommands.single().description).isEqualTo("Actual final")
    assertThat(fixture.itemCommands.map { it.name to it.amount.amount.toPlainString() }).containsExactly("Final A" to "30.00", "Final B" to "20.00")
    assertThat(fixture.itemCommands).allMatch { it.amount.currency == "GBP" }
    assertThat(fixture.postedDrafts).hasSize(1)
  }

  @Test
  fun `posts final income without expense sharing or original expense category`() {
    val fixture = fixture()
    val expected = fixture.expected(ExpectedMovementType.EXPENSE, categoryId = "expense-category")
    fixture.workflow.execute(PostExpectedMovementCommand(
      expected.id.toString(),
      ExpectedPostingMovementSnapshot(UUID.randomUUID().toString(), ExpectedMovementType.INCOME, BigDecimal("50.00"), "GBP", "Income final", "Income final", emptyList()),
      Instant.parse("2026-07-21T11:00:00Z"),
      idempotencyKey = "post-final-income",
    ))

    assertThat(fixture.recordIncomeCommands).hasSize(1)
    assertThat(fixture.recordExpenseCommands).isEmpty()
    assertThat(fixture.recordIncomeCommands.single().amount.currency).isEqualTo("GBP")
    assertThat(fixture.recordIncomeCommands.single().description).isEqualTo("Income final")
    assertThat(fixture.categorizedCommands.single().transactionType).isEqualTo("income")
    assertThat(fixture.categorizedCommands.single().categoryId).isNull()
    assertThat(fixture.materializedShares).isEmpty()
  }

  @Test
  fun `posts a recurring expected and acknowledges occurrence for next projection`() {
    val fixture = fixture()
    val nextId = ExpectedMovementId.random()
    val expected = fixture.expected(
      ExpectedMovementType.EXPENSE,
      originOccurrenceId = UUID.randomUUID().toString(),
      originRecurringMovementId = UUID.randomUUID().toString(),
    )
    fixture.nextExpectedMovementId = nextId

    val result = fixture.workflow.execute(
      PostExpectedMovementCommand(expected.id.toString(), expected.toPostingSnapshot(), Instant.parse("2026-07-21T10:00:00Z"), idempotencyKey = "post-recurring"),
    )

    assertThat(fixture.acknowledgedOccurrences).containsExactly(expected.originOccurrenceId)
    assertThat(result.nextExpectedMovementId).isEqualTo(nextId.toString())
  }

  private class Fixture {
    val repository = InMemoryExpectedRepository()
    val recordedTransactions = mutableListOf<TransactionId>()
    val acknowledgedOccurrences = mutableListOf<String>()
    var nextExpectedMovementId: ExpectedMovementId? = null
    lateinit var workflow: PostExpectedMovementWorkflow

    val recordExpenseCommands = mutableListOf<RecordLedgerExpenseCommand>()
    val recordIncomeCommands = mutableListOf<RecordLedgerIncomeCommand>()
    val draftCommands = mutableListOf<CreateLedgerExpenseDraftCommand>()
    val itemCommands = mutableListOf<AddLedgerTransactionItemCommand>()
    val postedDrafts = mutableListOf<PostLedgerDraftTransactionCommand>()
    val categorizedCommands = mutableListOf<CategorizeLedgerTransactionCommand>()
    val materializedShares = mutableListOf<MaterializePlannedShareCommand>()

    fun expected(type: ExpectedMovementType, originOccurrenceId: String? = null, originRecurringMovementId: String? = null, categoryId: String? = null, splitItems: List<ExpectedMovement.SplitItem> = emptyList()): ExpectedMovement {
      val value = ExpectedMovement.create(
        id = ExpectedMovementId.random(), accountId = UUID.randomUUID().toString(), type = type,
        amount = BigDecimal("12.00"), currency = "EUR", expectedAt = Instant.parse("2026-07-20T10:00:00Z"),
        description = "Expected", merchant = "Expected", categoryId = categoryId,
        originOccurrenceId = originOccurrenceId, originRecurringMovementId = originRecurringMovementId,
        splitItems = splitItems,
        createdAt = Instant.parse("2026-07-19T10:00:00Z"),
      )
      repository.save(value)
      return value
    }
  }

  private fun fixture(): Fixture {
    val fixture = Fixture()
    val recordExpense = object : RecordLedgerExpenseUC {
      override fun execute(command: RecordLedgerExpenseCommand): TransactionId = TransactionId.random().also { fixture.recordedTransactions.add(it); fixture.recordExpenseCommands.add(command) }
    }
    val recordIncome = object : RecordLedgerIncomeUC {
      override fun execute(command: RecordLedgerIncomeCommand): TransactionId = TransactionId.random().also { fixture.recordedTransactions.add(it); fixture.recordIncomeCommands.add(command) }
    }
    val resolveExpected = object : ResolveExpectedMovementUC {
      override fun execute(command: ResolveExpectedMovementCommand) {
        val current = fixture.repository.findById(command.expectedMovementId)!!
        fixture.repository.save(current.resolve(command.transactionId, command.resolvedAt))
      }
    }
    fixture.workflow = PostExpectedMovementWorkflow(
      expectedMovements = fixture.repository,
      recordExpense = recordExpense,
      recordIncome = recordIncome,
      createExpenseDraft = object : CreateLedgerExpenseDraftUC { override fun execute(command: CreateLedgerExpenseDraftCommand) = TransactionId.random().also { fixture.draftCommands.add(command) } },
      addItem = object : AddLedgerTransactionItemUC { override fun execute(command: AddLedgerTransactionItemCommand) { fixture.itemCommands.add(command) } },
      postDraft = object : PostLedgerDraftTransactionUC { override fun execute(command: PostLedgerDraftTransactionCommand) { fixture.postedDrafts.add(command) } },
      categorize = object : CategorizeLedgerTransactionUC { override fun execute(command: CategorizeLedgerTransactionCommand) = command.also { fixture.categorizedCommands.add(it) }.let { TxCategorizationState(it.transactionId.value, it.categoryId, CategorizationStatus.NONE, null, null, 0, null, it.requestedAt, it.requestedAt) } },
      applyTags = object : ApplyTransactionTagsUC { override fun execute(command: ApplyTransactionTagsCommand) = ApplyTransactionTagsResult(emptyList()) },
      ignoredWriter = MovementIgnoredWriter { _, _, _ -> },
      resolveExpected = resolveExpected,
      materializeShare = object : MaterializePlannedShareForPostedTransactionUC { override fun execute(command: MaterializePlannedShareCommand) = "share-1".also { fixture.materializedShares.add(command) } },
      plannedShares = EmptyPlannedShares,
      acknowledgeOccurrence = object : AcknowledgeRecurringMovementOccurrenceUC {
        override fun execute(command: AcknowledgeRecurringMovementOccurrenceCommand): RecurringMovementOccurrence {
          fixture.acknowledgedOccurrences.add(command.occurrenceId.toString())
          return RecurringMovementOccurrence.pending(command.occurrenceId, RecurringMovementId.random(), command.acknowledgedAt, command.acknowledgedAt)
        }
      },
      projectNext = object : ExpectedOccurrenceProjectionService { override fun projectNext(recurringMovementId: String, projectedAt: Instant) = fixture.nextExpectedMovementId },
      consistencyBoundary = ImmediateConsistencyBoundary,
      idempotency = InMemoryIdempotency(),
    )
    return fixture
  }

  private class InMemoryExpectedRepository : ExpectedMovementRepository {
    private val values = linkedMapOf<ExpectedMovementId, ExpectedMovement>()
    override fun save(movement: ExpectedMovement) { values[movement.id] = movement }
    override fun findById(id: ExpectedMovementId) = values[id]
    override fun findByOriginOccurrenceId(originOccurrenceId: String) = values.values.firstOrNull { it.originOccurrenceId == originOccurrenceId }
    override fun listByAccount(accountId: String, includeClosed: Boolean) = values.values.filter { it.accountId == accountId }
  }

  private class InMemoryIdempotency : ExpectedPostingIdempotencyRepository {
    private val values = mutableMapOf<String, ProcessedExpectedPosting>()
    override fun findByKey(idempotencyKey: String) = values[idempotencyKey]
    override fun findByExpectedMovementId(expectedMovementId: String) = values.values.firstOrNull { it.expectedMovementId == expectedMovementId }
    override fun save(processed: ProcessedExpectedPosting) { values[processed.idempotencyKey] = processed }
  }

  private object EmptyPlannedShares : PlannedExpenseShareRepository {
    override fun save(share: PlannedExpenseShare) = Unit
    override fun findById(id: PlannedExpenseShareId): PlannedExpenseShare? = null
    override fun findByExpectedMovementRef(ref: ExpectedMovementRef): PlannedExpenseShare? = null
  }
}

private fun ExpectedMovement.toPostingSnapshot() = ExpectedPostingMovementSnapshot(
  accountId = accountId,
  type = type,
  amount = amount,
  currency = currency,
  description = description,
  merchant = merchant,
  splitItems = splitItems.map { ExpectedPostingSplitItem(it.id, it.name, it.amount) },
)
