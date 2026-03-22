package com.gonezo.application.services.workflows

import com.gonezo.application.workflows.CategorizationStatus
import com.gonezo.application.workflows.GetCategorizedLedgerTransactionListQuery
import com.gonezo.application.workflows.TxCategorizationState
import com.gonezo.application.workflows.TxCategorizationStateRepository
import com.gonezo.domain.ledger.AccountId
import com.gonezo.domain.ledger.DateRange
import com.gonezo.domain.ledger.Transaction
import com.gonezo.domain.ledger.TransactionId
import com.gonezo.domain.ledger.TransactionStatus
import com.gonezo.domain.ledger.TransactionType
import com.gonezo.domain.ledger.ports.LedgerTransactionRepository
import com.gonezo.domain.shared.Money
import com.gonezo.domain.taxonomy.Category
import com.gonezo.domain.taxonomy.CategoryAppliesTo
import com.gonezo.domain.taxonomy.CategoryId
import com.gonezo.domain.taxonomy.CategoryStatus
import com.gonezo.domain.taxonomy.TransactionCategoryAssignment
import com.gonezo.domain.taxonomy.ports.CategoryRepository
import com.gonezo.domain.taxonomy.ports.TransactionCategoryAssignmentRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class ListLedgerTransactionsWithCategorizationServiceTest {

  @Test
  fun `returns none when no assignment and no workflow state`() {
    val tx = sampleExpense()
    val service = serviceWith(listOf(tx))

    val result = service.execute(
      GetCategorizedLedgerTransactionListQuery(
        accountId = tx.accountId,
        limit = 20,
      ),
    )

    assertThat(result).hasSize(1)
    assertThat(result.first().categorization.status).isEqualTo(CategorizationStatus.NONE)
    assertThat(result.first().category).isNull()
  }

  @Test
  fun `returns assigned category when assignment exists`() {
    val tx = sampleExpense()
    val category = sampleCategory("Food")
    val assignment = TransactionCategoryAssignment.assign(tx.id.value, category.id, Instant.parse("2026-03-22T20:00:00Z"))
    val service = serviceWith(
      transactions = listOf(tx),
      categories = listOf(category),
      assignments = listOf(assignment),
    )

    val result = service.execute(GetCategorizedLedgerTransactionListQuery(accountId = tx.accountId))

    assertThat(result).hasSize(1)
    assertThat(result.first().categorization.status).isEqualTo(CategorizationStatus.ASSIGNED)
    assertThat(result.first().category).isNotNull
    assertThat(result.first().category!!.name).isEqualTo("Food")
  }

  @Test
  fun `returns pending when workflow state is pending`() {
    val tx = sampleExpense()
    val category = sampleCategory("Food")
    val service = serviceWith(
      transactions = listOf(tx),
      categories = listOf(category),
      states = listOf(
        TxCategorizationState(
          transactionId = tx.id.value,
          requestedCategoryId = category.id,
          status = CategorizationStatus.PENDING,
          errorCode = null,
          errorMessage = null,
          attempts = 1,
          nextAttemptAt = null,
          updatedAt = Instant.parse("2026-03-22T20:00:00Z"),
          createdAt = Instant.parse("2026-03-22T20:00:00Z"),
        ),
      ),
    )

    val result = service.execute(GetCategorizedLedgerTransactionListQuery(accountId = tx.accountId))

    assertThat(result.first().categorization.status).isEqualTo(CategorizationStatus.PENDING)
    assertThat(result.first().categorization.requestedCategoryId).isEqualTo(category.id)
  }

  @Test
  fun `returns failed with error code when workflow state failed`() {
    val tx = sampleExpense()
    val service = serviceWith(
      transactions = listOf(tx),
      states = listOf(
        TxCategorizationState(
          transactionId = tx.id.value,
          requestedCategoryId = CategoryId.random(),
          status = CategorizationStatus.FAILED,
          errorCode = "CATEGORY_NOT_FOUND",
          errorMessage = "CATEGORY_NOT_FOUND",
          attempts = 2,
          nextAttemptAt = Instant.parse("2026-03-22T20:10:00Z"),
          updatedAt = Instant.parse("2026-03-22T20:00:00Z"),
          createdAt = Instant.parse("2026-03-22T20:00:00Z"),
        ),
      ),
    )

    val result = service.execute(GetCategorizedLedgerTransactionListQuery(accountId = tx.accountId))

    assertThat(result.first().categorization.status).isEqualTo(CategorizationStatus.FAILED)
    assertThat(result.first().categorization.errorCode).isEqualTo("CATEGORY_NOT_FOUND")
  }

  private fun serviceWith(
    transactions: List<Transaction>,
    categories: List<Category> = emptyList(),
    assignments: List<TransactionCategoryAssignment> = emptyList(),
    states: List<TxCategorizationState> = emptyList(),
  ): ListLedgerTransactionsWithCategorizationService = ListLedgerTransactionsWithCategorizationService(
    transactionRepository = InMemoryLedgerTransactionRepository(transactions),
    assignmentRepository = InMemoryAssignmentRepository(assignments),
    categoryRepository = InMemoryCategoryRepository(categories),
    stateRepository = InMemoryStateRepository(states),
  )

  private fun sampleExpense(): Transaction = Transaction.recordExpense(
    id = TransactionId.random(),
    accountId = AccountId.random(),
    amount = Money(BigDecimal("80.00"), "EUR"),
    occurredAt = Instant.parse("2026-03-22T19:00:00Z"),
    description = "Dinner",
    merchant = "Restaurant",
  )

  private fun sampleCategory(name: String): Category = Category(
    id = CategoryId.random(),
    name = name,
    appliesTo = CategoryAppliesTo.EXPENSE,
    status = CategoryStatus.ACTIVE,
    createdAt = Instant.parse("2026-03-22T18:00:00Z"),
    archivedAt = null,
  )
}

private class InMemoryLedgerTransactionRepository(
  private val transactions: List<Transaction>,
) : LedgerTransactionRepository {
  override fun save(transaction: Transaction) = Unit

  override fun findById(id: TransactionId): Transaction? = transactions.firstOrNull { it.id == id }

  override fun findByAccount(accountId: AccountId, limit: Int?): List<Transaction> =
    transactions.filter { it.accountId == accountId }.let { list -> limit?.let { list.take(it) } ?: list }

  override fun findByAccountAndPeriod(accountId: AccountId, range: DateRange): List<Transaction> =
    transactions.filter {
      it.accountId == accountId &&
        !it.occurredAt.isBefore(range.from) &&
        !it.occurredAt.isAfter(range.to)
    }

  override fun findByAccountAndMerchant(accountId: AccountId, merchant: String): List<Transaction> =
    transactions.filter { it.accountId == accountId && it.merchant.equals(merchant, ignoreCase = true) }
}

private class InMemoryAssignmentRepository(
  assignments: List<TransactionCategoryAssignment>,
) : TransactionCategoryAssignmentRepository {
  private val values = assignments.associateBy { it.transactionId }.toMutableMap()

  override fun upsert(assignment: TransactionCategoryAssignment) {
    values[assignment.transactionId] = assignment
  }

  override fun deleteByTransactionId(transactionId: UUID) {
    values.remove(transactionId)
  }

  override fun findByTransactionId(transactionId: UUID): TransactionCategoryAssignment? = values[transactionId]

  override fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, TransactionCategoryAssignment> =
    transactionIds.mapNotNull { id -> values[id]?.let { id to it } }.toMap()
}

private class InMemoryCategoryRepository(
  categories: List<Category>,
) : CategoryRepository {
  private val values = categories.associateBy { it.id }.toMutableMap()

  override fun save(category: Category) {
    values[category.id] = category
  }

  override fun findById(id: CategoryId): Category? = values[id]

  override fun findByIds(ids: Collection<CategoryId>): Map<CategoryId, Category> =
    ids.mapNotNull { id -> values[id]?.let { id to it } }.toMap()

  override fun findByNormalizedNameAndAppliesTo(name: String, appliesTo: CategoryAppliesTo): Category? =
    values.values.firstOrNull { it.name.equals(name.trim(), ignoreCase = true) && it.appliesTo == appliesTo }

  override fun listAll(): List<Category> = values.values.toList()
}

private class InMemoryStateRepository(
  states: List<TxCategorizationState>,
) : TxCategorizationStateRepository {
  private val values = states.associateBy { it.transactionId }.toMutableMap()

  override fun upsert(state: TxCategorizationState) {
    values[state.transactionId] = state
  }

  override fun findByTransactionId(transactionId: UUID): TxCategorizationState? = values[transactionId]

  override fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, TxCategorizationState> =
    transactionIds.mapNotNull { id -> values[id]?.let { id to it } }.toMap()

  override fun findPending(now: Instant, limit: Int): List<TxCategorizationState> =
    values.values.filter { it.status == CategorizationStatus.PENDING }.take(limit)
}
