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
  fun `lists categories ordered by usage count then normalized name then id`() {
    val categoryRepository = JdbcTaxonomyCategoryRepository(db.namedJdbcTemplate)
    val groceries = Category.create(
      id = CategoryId.from("00000000-0000-4000-8000-00000000aaa1"),
      name = "Produce",
      appliesTo = CategoryAppliesTo.EXPENSE,
      createdAt = Instant.parse("2026-03-22T12:00:00Z"),
    )
    val beauty = Category.create(
      id = CategoryId.from("00000000-0000-4000-8000-00000000aaa2"),
      name = "Bakery",
      appliesTo = CategoryAppliesTo.EXPENSE,
      createdAt = Instant.parse("2026-03-22T12:01:00Z"),
    )
    val entertainment = Category.create(
      id = CategoryId.from("00000000-0000-4000-8000-00000000aaa3"),
      name = "Cinema",
      appliesTo = CategoryAppliesTo.EXPENSE,
      createdAt = Instant.parse("2026-03-22T12:02:00Z"),
    )
    categoryRepository.save(groceries)
    categoryRepository.save(beauty)
    categoryRepository.save(entertainment)

    db.jdbcTemplate.update(
      """
        insert into ledger_accounts (id, name, type, currency, status, created_at, archived_at)
        values (?, ?, ?, ?, ?, ?, ?)
      """.trimIndent(),
      "acc-1",
      "Main",
      "cash",
      "USD",
      "active",
      "2026-03-22T10:00:00Z",
      null,
    )
    db.jdbcTemplate.update(
      """
        insert into ledger_transactions (id, account_id, type, amount, currency, occurred_at, description, merchant, category_id, status, linked_transaction_id)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """.trimIndent(),
      "00000000-0000-4000-8000-000000000001",
      "acc-1",
      "expense",
      "15.00",
      "USD",
      "2026-03-22T13:00:00Z",
      "Groceries",
      null,
      null,
      "posted",
      null,
    )
    db.jdbcTemplate.update(
      """
        insert into ledger_transactions (id, account_id, type, amount, currency, occurred_at, description, merchant, category_id, status, linked_transaction_id)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """.trimIndent(),
      "00000000-0000-4000-8000-000000000002",
      "acc-1",
      "expense",
      "20.00",
      "USD",
      "2026-03-22T14:00:00Z",
      "Movie night",
      null,
      null,
      "posted",
      null,
    )
    db.jdbcTemplate.update(
      """
        insert into ledger_transactions (id, account_id, type, amount, currency, occurred_at, description, merchant, category_id, status, linked_transaction_id)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """.trimIndent(),
      "00000000-0000-4000-8000-000000000003",
      "acc-1",
      "expense",
      "18.00",
      "USD",
      "2026-03-22T15:00:00Z",
      "Dinner",
      null,
      null,
      "posted",
      null,
    )
    db.jdbcTemplate.update(
      """
        insert into taxonomy_transaction_assignments (transaction_id, category_id, assigned_at)
        values (?, ?, ?), (?, ?, ?), (?, ?, ?)
      """.trimIndent(),
      "00000000-0000-4000-8000-000000000001",
      groceries.id.toString(),
      "2026-03-22T13:00:00Z",
      "00000000-0000-4000-8000-000000000002",
      entertainment.id.toString(),
      "2026-03-22T14:00:00Z",
      "00000000-0000-4000-8000-000000000003",
      groceries.id.toString(),
      "2026-03-22T15:00:00Z",
    )

    val listed = categoryRepository.listAll()

    assertThat(listed.take(3).map { it.category.id }).containsExactly(
      groceries.id,
      entertainment.id,
      beauty.id,
    )
    assertThat(listed.take(3).map { it.usageCount }).containsExactly(2, 1, 0)
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
      name = "Commute",
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
