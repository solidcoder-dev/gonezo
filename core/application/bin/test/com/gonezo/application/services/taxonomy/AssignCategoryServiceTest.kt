package com.gonezo.taxonomy.application

import com.gonezo.taxonomy.application.AssignCategoryToTransactionCommand
import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.CategoryStatus
import com.gonezo.taxonomy.domain.TransactionCategoryAssignment
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class AssignCategoryServiceTest {

  @Test
  fun `assigns expense category to transaction`() {
    val repo = InMemoryCategoryRepository(
      Category.create(
        id = CategoryId.random(),
        name = "Food",
        appliesTo = CategoryAppliesTo.EXPENSE,
        createdAt = Instant.parse("2026-03-22T10:00:00Z"),
      ),
    )
    val assignmentRepo = InMemoryAssignmentRepository()
    val service = AssignCategoryToTransactionService(repo, assignmentRepo)
    val txId = UUID.randomUUID()
    val categoryId = repo.only().id

    service.execute(
      AssignCategoryToTransactionCommand(
        transactionId = txId,
        categoryId = categoryId,
        transactionType = "expense",
        assignedAt = Instant.parse("2026-03-22T11:00:00Z"),
      ),
    )

    val assignment = assignmentRepo.findByTransactionId(txId)
    assertThat(assignment).isNotNull
    assertThat(assignment!!.categoryId).isEqualTo(categoryId)
  }

  @Test
  fun `rejects transfer categorization`() {
    val repo = InMemoryCategoryRepository(
      Category.create(
        id = CategoryId.random(),
        name = "Food",
        appliesTo = CategoryAppliesTo.EXPENSE,
        createdAt = Instant.parse("2026-03-22T10:00:00Z"),
      ),
    )
    val assignmentRepo = InMemoryAssignmentRepository()
    val service = AssignCategoryToTransactionService(repo, assignmentRepo)

    assertThatThrownBy {
      service.execute(
        AssignCategoryToTransactionCommand(
          transactionId = UUID.randomUUID(),
          categoryId = repo.only().id,
          transactionType = "transfer_out",
          assignedAt = Instant.parse("2026-03-22T11:00:00Z"),
        ),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `rejects archived category`() {
    val repo = InMemoryCategoryRepository(
      Category(
        id = CategoryId.random(),
        name = "Food",
        appliesTo = CategoryAppliesTo.EXPENSE,
        status = CategoryStatus.ARCHIVED,
        createdAt = Instant.parse("2026-03-22T10:00:00Z"),
        archivedAt = Instant.parse("2026-03-22T10:30:00Z"),
      ),
    )
    val assignmentRepo = InMemoryAssignmentRepository()
    val service = AssignCategoryToTransactionService(repo, assignmentRepo)

    assertThatThrownBy {
      service.execute(
        AssignCategoryToTransactionCommand(
          transactionId = UUID.randomUUID(),
          categoryId = repo.only().id,
          transactionType = "expense",
          assignedAt = Instant.parse("2026-03-22T11:00:00Z"),
        ),
      )
    }.isInstanceOf(IllegalStateException::class.java)
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

  override fun listAll(): List<Category> = categories.toList()

  fun only(): Category = categories.single()
}

private class InMemoryAssignmentRepository : TransactionCategoryAssignmentRepository {
  private val assignments = linkedMapOf<UUID, TransactionCategoryAssignment>()

  override fun upsert(assignment: TransactionCategoryAssignment) {
    assignments[assignment.transactionId] = assignment
  }

  override fun deleteByTransactionId(transactionId: UUID) {
    assignments.remove(transactionId)
  }

  override fun findByTransactionId(transactionId: UUID): TransactionCategoryAssignment? = assignments[transactionId]

  override fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, TransactionCategoryAssignment> =
    transactionIds.mapNotNull { id -> assignments[id]?.let { id to it } }.toMap()
}
