package com.gonezo.infrastructure.mobills

import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.application.orchestration.ApplyTransactionTagsService
import com.gonezo.application.orchestration.CategorizeLedgerTransactionService
import com.gonezo.application.orchestration.ProcessTransactionCategorizationService
import com.gonezo.application.orchestration.mobills.ImportMobillsPolicy
import com.gonezo.application.orchestration.mobills.ImportMobillsStatementService
import com.gonezo.infrastructure.persistence.JdbcTxCategorizationStateRepository
import com.gonezo.ledger.application.ListLedgerAccountsService
import com.gonezo.ledger.application.OpenLedgerAccountService
import com.gonezo.ledger.application.RecordLedgerExpenseService
import com.gonezo.ledger.application.RecordLedgerIncomeService
import com.gonezo.ledger.infrastructure.persistence.JdbcLedgerAccountRepository
import com.gonezo.ledger.infrastructure.persistence.JdbcLedgerTransactionRepository
import com.gonezo.taxonomy.application.AssignCategoryToTransactionService
import com.gonezo.taxonomy.application.CreateCategoryService
import com.gonezo.taxonomy.application.CreateTagService
import com.gonezo.taxonomy.application.ListCategoriesService
import com.gonezo.taxonomy.application.ReplaceTransactionTagsService
import com.gonezo.taxonomy.infrastructure.persistence.JdbcTaxonomyCategoryRepository
import com.gonezo.taxonomy.infrastructure.persistence.JdbcTaxonomyTagRepository
import com.gonezo.taxonomy.infrastructure.persistence.JdbcTaxonomyTransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.infrastructure.persistence.JdbcTaxonomyTransactionTagAssignmentRepository
import com.gonezo.testing.SqliteE2ETest
import com.gonezo.testing.decimal
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.nio.charset.StandardCharsets
import java.time.Instant

class MobillsImportCoordinatorE2ETest : SqliteE2ETest() {

  @Test
  fun `imports utf16 mobills file and coordinates ledger with taxonomy`() {
    val namedJdbc = db.namedJdbcTemplate
    val parser = MobillsTsvParser()
    val importUC = ImportMobillsStatementService(
      listAccountsUC = ListLedgerAccountsService(JdbcLedgerAccountRepository(namedJdbc)),
      openAccountUC = OpenLedgerAccountService(
        accountRepository = JdbcLedgerAccountRepository(namedJdbc),
        transactionRepository = JdbcLedgerTransactionRepository(namedJdbc),
        domainEventPublisher = NoopDomainEventPublisher(),
      ),
      recordExpenseUC = RecordLedgerExpenseService(
        accountRepository = JdbcLedgerAccountRepository(namedJdbc),
        transactionRepository = JdbcLedgerTransactionRepository(namedJdbc),
        domainEventPublisher = NoopDomainEventPublisher(),
      ),
      recordIncomeUC = RecordLedgerIncomeService(
        accountRepository = JdbcLedgerAccountRepository(namedJdbc),
        transactionRepository = JdbcLedgerTransactionRepository(namedJdbc),
        domainEventPublisher = NoopDomainEventPublisher(),
      ),
      listCategoriesUC = ListCategoriesService(JdbcTaxonomyCategoryRepository(namedJdbc)),
      categorizeLedgerTransactionUC = CategorizeLedgerTransactionService(
        categoryRepository = JdbcTaxonomyCategoryRepository(namedJdbc),
        createCategoryUC = CreateCategoryService(JdbcTaxonomyCategoryRepository(namedJdbc)),
        processCategorizationUC = ProcessTransactionCategorizationService(
          taxonomyAssignCategoryUC = AssignCategoryToTransactionService(
            categoryRepository = JdbcTaxonomyCategoryRepository(namedJdbc),
            assignmentRepository = JdbcTaxonomyTransactionCategoryAssignmentRepository(namedJdbc),
          ),
          stateRepository = JdbcTxCategorizationStateRepository(namedJdbc),
        ),
      ),
      applyTransactionTagsUC = ApplyTransactionTagsService(
        tagRepository = JdbcTaxonomyTagRepository(namedJdbc),
        createTagUC = CreateTagService(JdbcTaxonomyTagRepository(namedJdbc)),
        replaceTransactionTagsUC = ReplaceTransactionTagsService(
          tagRepository = JdbcTaxonomyTagRepository(namedJdbc),
          assignmentRepository = JdbcTaxonomyTransactionTagAssignmentRepository(namedJdbc),
        ),
      ),
    )
    val coordinator = MobillsImportCoordinator(parser, importUC)
    val fileBytes = """
      date	account	value	currency	description	merchant	category	subcategory	tags
      2026-03-20	Wallet	-12.50	EUR	Lunch	Cafe	Food	Eating Out	trip|london
    """.trimIndent().replace("\n", "\r\n").toByteArray(StandardCharsets.UTF_16)

    val result = coordinator.importBytes(
      bytes = fileBytes,
      requestedAt = Instant.parse("2026-03-22T12:00:00Z"),
      policy = ImportMobillsPolicy(
        createMissingAccounts = true,
        createMissingCategories = true,
        createMissingTags = true,
      ),
    )

    assertThat(result.totalRows).isEqualTo(1)
    assertThat(result.importedCount).isEqualTo(1)
    assertThat(result.failedCount).isEqualTo(0)
    val transactionId = requireNotNull(result.rows.single().transactionId).toString()

    val tx = db.jdbcTemplate.queryForMap(
      """
      select id, type, amount, currency, description, merchant
      from ledger_transactions
      where id = ?
      """.trimIndent(),
      transactionId,
    )
    assertThat(tx["type"]).isEqualTo("expense")
    assertThat(decimal(tx["amount"])).isEqualByComparingTo("12.50")
    assertThat(tx["currency"]).isEqualTo("EUR")
    assertThat(tx["description"]).isEqualTo("Lunch")
    assertThat(tx["merchant"]).isEqualTo("Cafe")

    val category = db.jdbcTemplate.queryForMap(
      "select id, name, applies_to from taxonomy_categories where name_normalized = 'food'",
    )
    assertThat(category["name"]).isEqualTo("Food")
    assertThat(category["applies_to"]).isEqualTo("expense")

    val categoryAssignment = db.jdbcTemplate.queryForMap(
      "select transaction_id, category_id from taxonomy_transaction_assignments where transaction_id = ?",
      transactionId,
    )
    assertThat(categoryAssignment["transaction_id"]).isEqualTo(transactionId)
    assertThat(categoryAssignment["category_id"]).isEqualTo(category["id"])

    val tags = db.jdbcTemplate.queryForList(
      "select name from taxonomy_tags order by name asc",
      String::class.java,
    )
    assertThat(tags).containsExactly("london", "trip")

    val tagAssignments = db.jdbcTemplate.queryForList(
      "select tag_id from taxonomy_transaction_tag_assignments where transaction_id = ?",
      String::class.java,
      transactionId,
    )
    assertThat(tagAssignments).hasSize(2)
  }
}

private class NoopDomainEventPublisher : DomainEventPublisher {
  override fun publish(event: Any) = Unit
}

