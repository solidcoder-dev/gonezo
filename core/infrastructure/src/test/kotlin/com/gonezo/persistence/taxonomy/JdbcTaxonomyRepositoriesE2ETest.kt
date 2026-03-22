package com.gonezo.persistence.taxonomy

import com.gonezo.domain.taxonomy.Category
import com.gonezo.domain.taxonomy.CategoryAppliesTo
import com.gonezo.domain.taxonomy.CategoryId
import com.gonezo.domain.taxonomy.TransactionCategoryAssignment
import com.gonezo.infrastructure.persistence.JdbcTaxonomyCategoryRepository
import com.gonezo.infrastructure.persistence.JdbcTaxonomyTransactionCategoryAssignmentRepository
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class JdbcTaxonomyRepositoriesE2ETest : SqliteE2ETest() {

  @Test
  fun `saves and finds category by id`() {
    val categoryRepository = JdbcTaxonomyCategoryRepository(db.namedJdbcTemplate)
    val category = Category.create(
      id = CategoryId.random(),
      name = "Food",
      appliesTo = CategoryAppliesTo.EXPENSE,
      createdAt = Instant.parse("2026-03-22T12:00:00Z"),
    )

    categoryRepository.save(category)
    val stored = categoryRepository.findById(category.id)

    assertThat(stored).isNotNull
    assertThat(stored!!.name).isEqualTo("Food")
    assertThat(stored.appliesTo).isEqualTo(CategoryAppliesTo.EXPENSE)
  }

  @Test
  fun `upsert assignment replaces existing category for same transaction`() {
    val categoryRepository = JdbcTaxonomyCategoryRepository(db.namedJdbcTemplate)
    val assignmentRepository = JdbcTaxonomyTransactionCategoryAssignmentRepository(db.namedJdbcTemplate)
    val txId = UUID.randomUUID()
    val firstCategory = Category.create(
      id = CategoryId.random(),
      name = "Food",
      appliesTo = CategoryAppliesTo.EXPENSE,
      createdAt = Instant.parse("2026-03-22T12:00:00Z"),
    )
    val secondCategory = Category.create(
      id = CategoryId.random(),
      name = "Transport",
      appliesTo = CategoryAppliesTo.EXPENSE,
      createdAt = Instant.parse("2026-03-22T12:01:00Z"),
    )
    categoryRepository.save(firstCategory)
    categoryRepository.save(secondCategory)

    assignmentRepository.upsert(TransactionCategoryAssignment.assign(txId, firstCategory.id, Instant.parse("2026-03-22T13:00:00Z")))
    assignmentRepository.upsert(TransactionCategoryAssignment.assign(txId, secondCategory.id, Instant.parse("2026-03-22T14:00:00Z")))

    val stored = assignmentRepository.findByTransactionId(txId)
    assertThat(stored).isNotNull
    assertThat(stored!!.categoryId).isEqualTo(secondCategory.id)
  }

  @Test
  fun `find by transaction ids returns only existing assignments`() {
    val categoryRepository = JdbcTaxonomyCategoryRepository(db.namedJdbcTemplate)
    val assignmentRepository = JdbcTaxonomyTransactionCategoryAssignmentRepository(db.namedJdbcTemplate)
    val category = Category.create(
      id = CategoryId.random(),
      name = "Salary",
      appliesTo = CategoryAppliesTo.INCOME,
      createdAt = Instant.parse("2026-03-22T12:00:00Z"),
    )
    categoryRepository.save(category)

    val txWithAssignment = UUID.randomUUID()
    val txWithoutAssignment = UUID.randomUUID()
    assignmentRepository.upsert(
      TransactionCategoryAssignment.assign(
        transactionId = txWithAssignment,
        categoryId = category.id,
        assignedAt = Instant.parse("2026-03-22T13:00:00Z"),
      ),
    )

    val assignments = assignmentRepository.findByTransactionIds(listOf(txWithAssignment, txWithoutAssignment))
    assertThat(assignments).hasSize(1)
    assertThat(assignments).containsKey(txWithAssignment)
  }
}
