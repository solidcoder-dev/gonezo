package com.gonezo.application.orchestration

import com.gonezo.application.orchestration.CategorizationStatus
import com.gonezo.application.orchestration.ProcessTransactionCategorizationCommand
import com.gonezo.application.orchestration.ProcessTransactionCategorizationUC
import com.gonezo.application.orchestration.TxCategorizationState
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.taxonomy.application.CreateCategoryCommand
import com.gonezo.taxonomy.application.CreateCategoryUC
import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.CategoryWithUsage
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class CategorizeLedgerTransactionServiceTest {

  @Test
  fun `categorizes with existing category id`() {
    val expenseCategory = Category.create(
      id = CategoryId.random(),
      name = "Food",
      appliesTo = CategoryAppliesTo.EXPENSE,
      createdAt = Instant.parse("2026-03-22T12:00:00Z"),
    )
    val categoryRepository = InMemoryCategoryRepository(expenseCategory)
    val createCategoryUC = RecordingCreateCategoryUC()
    val processUC = RecordingProcessCategorizationUC()
    val service = CategorizeLedgerTransactionService(categoryRepository, createCategoryUC, processUC)
    val txId = TransactionId.random()

    val result = service.execute(
      CategorizeLedgerTransactionCommand(
        transactionId = txId,
        transactionType = "expense",
        categoryId = expenseCategory.id,
        requestedAt = Instant.parse("2026-03-22T12:10:00Z"),
      ),
    )

    assertThat(result.status).isEqualTo(CategorizationStatus.ASSIGNED)
    assertThat(createCategoryUC.calls).isEmpty()
    assertThat(processUC.calls).hasSize(1)
    assertThat(processUC.calls.single().requestedCategoryId).isEqualTo(expenseCategory.id)
  }

  @Test
  fun `creates category when new name is provided`() {
    val categoryRepository = InMemoryCategoryRepository()
    val createdCategoryId = CategoryId.random()
    val createCategoryUC = RecordingCreateCategoryUC(createdCategoryId)
    val processUC = RecordingProcessCategorizationUC()
    val service = CategorizeLedgerTransactionService(categoryRepository, createCategoryUC, processUC)
    val txId = TransactionId.random()

    val result = service.execute(
      CategorizeLedgerTransactionCommand(
        transactionId = txId,
        transactionType = "income",
        newCategoryName = "Salary",
        requestedAt = Instant.parse("2026-03-22T12:10:00Z"),
      ),
    )

    assertThat(result.status).isEqualTo(CategorizationStatus.ASSIGNED)
    assertThat(createCategoryUC.calls).hasSize(1)
    assertThat(createCategoryUC.calls.single().name).isEqualTo("Salary")
    assertThat(createCategoryUC.calls.single().appliesTo).isEqualTo(CategoryAppliesTo.INCOME)
    assertThat(processUC.calls.single().requestedCategoryId).isEqualTo(createdCategoryId)
  }

  @Test
  fun `rejects when both category id and new category name are provided`() {
    val categoryRepository = InMemoryCategoryRepository()
    val createCategoryUC = RecordingCreateCategoryUC()
    val processUC = RecordingProcessCategorizationUC()
    val service = CategorizeLedgerTransactionService(categoryRepository, createCategoryUC, processUC)

    assertThatThrownBy {
      service.execute(
        CategorizeLedgerTransactionCommand(
          transactionId = TransactionId.random(),
          transactionType = "expense",
          categoryId = CategoryId.random(),
          newCategoryName = "Food",
          requestedAt = Instant.parse("2026-03-22T12:10:00Z"),
        ),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)

    assertThat(createCategoryUC.calls).isEmpty()
    assertThat(processUC.calls).isEmpty()
  }

  @Test
  fun `rejects category with different applies to`() {
    val incomeCategory = Category.create(
      id = CategoryId.random(),
      name = "Salary",
      appliesTo = CategoryAppliesTo.INCOME,
      createdAt = Instant.parse("2026-03-22T12:00:00Z"),
    )
    val categoryRepository = InMemoryCategoryRepository(incomeCategory)
    val createCategoryUC = RecordingCreateCategoryUC()
    val processUC = RecordingProcessCategorizationUC()
    val service = CategorizeLedgerTransactionService(categoryRepository, createCategoryUC, processUC)

    assertThatThrownBy {
      service.execute(
        CategorizeLedgerTransactionCommand(
          transactionId = TransactionId.random(),
          transactionType = "expense",
          categoryId = incomeCategory.id,
          requestedAt = Instant.parse("2026-03-22T12:10:00Z"),
        ),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)

    assertThat(processUC.calls).isEmpty()
  }

  @Test
  fun `throws when orchestration processing ends as failed`() {
    val expenseCategory = Category.create(
      id = CategoryId.random(),
      name = "Food",
      appliesTo = CategoryAppliesTo.EXPENSE,
      createdAt = Instant.parse("2026-03-22T12:00:00Z"),
    )
    val categoryRepository = InMemoryCategoryRepository(expenseCategory)
    val createCategoryUC = RecordingCreateCategoryUC()
    val processUC = RecordingProcessCategorizationUC(
      forcedStatus = CategorizationStatus.FAILED,
      errorCode = "CATEGORY_NOT_FOUND",
      errorMessage = "Category not found",
    )
    val service = CategorizeLedgerTransactionService(categoryRepository, createCategoryUC, processUC)

    assertThatThrownBy {
      service.execute(
        CategorizeLedgerTransactionCommand(
          transactionId = TransactionId.random(),
          transactionType = "expense",
          categoryId = expenseCategory.id,
          requestedAt = Instant.parse("2026-03-22T12:10:00Z"),
        ),
      )
    }.isInstanceOf(IllegalStateException::class.java)
      .hasMessageContaining("CATEGORY_NOT_FOUND")
  }
}

private class InMemoryCategoryRepository(
  private vararg val categories: Category,
) : CategoryRepository {
  override fun save(category: Category) = Unit

  override fun findById(id: CategoryId): Category? = categories.firstOrNull { it.id == id }

  override fun findByIds(ids: Collection<CategoryId>): Map<CategoryId, Category> =
    ids.mapNotNull { id -> categories.firstOrNull { it.id == id }?.let { id to it } }.toMap()

  override fun findByNormalizedNameAndAppliesTo(name: String, appliesTo: CategoryAppliesTo): Category? =
    categories.firstOrNull { it.name.equals(name.trim(), ignoreCase = true) && it.appliesTo == appliesTo }

  override fun listAll(): List<CategoryWithUsage> = categories.map { CategoryWithUsage(it, 0) }
}

private class RecordingCreateCategoryUC(
  private val generatedId: CategoryId = CategoryId.random(),
) : CreateCategoryUC {
  val calls = mutableListOf<CreateCategoryCommand>()

  override fun execute(command: CreateCategoryCommand): CategoryId {
    calls += command
    return generatedId
  }
}

private class RecordingProcessCategorizationUC(
  private val forcedStatus: CategorizationStatus = CategorizationStatus.ASSIGNED,
  private val errorCode: String? = null,
  private val errorMessage: String? = null,
) : ProcessTransactionCategorizationUC {
  val calls = mutableListOf<ProcessTransactionCategorizationCommand>()

  override fun execute(command: ProcessTransactionCategorizationCommand): TxCategorizationState {
    calls += command
    return TxCategorizationState(
      transactionId = command.transactionId,
      requestedCategoryId = command.requestedCategoryId,
      status = forcedStatus,
      errorCode = errorCode,
      errorMessage = errorMessage,
      attempts = 1,
      nextAttemptAt = null,
      updatedAt = command.processedAt,
      createdAt = command.processedAt,
    )
  }
}
