package com.gonezo.persistence.taxonomy

import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TransactionCategoryAssignment
import com.gonezo.taxonomy.domain.TransactionTagAssignment
import com.gonezo.taxonomy.infrastructure.persistence.JdbcTaxonomyCategoryRepository
import com.gonezo.taxonomy.infrastructure.persistence.JdbcTaxonomyTagRepository
import com.gonezo.taxonomy.infrastructure.persistence.JdbcTaxonomyTransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.infrastructure.persistence.JdbcTaxonomyTransactionTagAssignmentRepository
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

  @Test
  fun `saves and finds tag by id`() {
    val tagRepository = JdbcTaxonomyTagRepository(db.namedJdbcTemplate)
    val tag = Tag.create(
      id = TagId.random(),
      name = "london",
      createdAt = Instant.parse("2026-03-22T12:00:00Z"),
    )

    tagRepository.save(tag)
    val stored = tagRepository.findById(tag.id)

    assertThat(stored).isNotNull
    assertThat(stored!!.name).isEqualTo("london")
  }

  @Test
  fun `replaces tag assignments for same transaction`() {
    val tagRepository = JdbcTaxonomyTagRepository(db.namedJdbcTemplate)
    val assignmentRepository = JdbcTaxonomyTransactionTagAssignmentRepository(db.namedJdbcTemplate)
    val txId = UUID.randomUUID()
    val travel = Tag.create(
      id = TagId.random(),
      name = "travel",
      createdAt = Instant.parse("2026-03-22T12:00:00Z"),
    )
    val london = Tag.create(
      id = TagId.random(),
      name = "london",
      createdAt = Instant.parse("2026-03-22T12:01:00Z"),
    )
    tagRepository.save(travel)
    tagRepository.save(london)

    assignmentRepository.replaceByTransactionId(
      txId,
      listOf(TransactionTagAssignment.assign(txId, travel.id, Instant.parse("2026-03-22T13:00:00Z"))),
    )
    assignmentRepository.replaceByTransactionId(
      txId,
      listOf(
        TransactionTagAssignment.assign(txId, travel.id, Instant.parse("2026-03-22T14:00:00Z")),
        TransactionTagAssignment.assign(txId, london.id, Instant.parse("2026-03-22T14:00:00Z")),
      ),
    )

    val assigned = assignmentRepository.findByTransactionId(txId)
    assertThat(assigned.map { it.tagId }).containsExactlyInAnyOrder(travel.id, london.id)
  }
}
