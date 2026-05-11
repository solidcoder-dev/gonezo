package com.gonezo.application.orchestration.backup

import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.AccountStatus
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.DateRange
import com.gonezo.ledger.domain.Transaction
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.ledger.domain.ports.LedgerAccountRepository
import com.gonezo.ledger.domain.ports.LedgerTransactionRepository
import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TransactionCategoryAssignment
import com.gonezo.taxonomy.domain.TransactionTagAssignment
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TagRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class ImportMovementsBackupServiceTest {
  private val importedAt = Instant.parse("2026-05-11T08:00:00Z")

  @Test
  fun `imports backup preserving identities and taxonomy references`() {
    val accountId = "7b7ef4ef-a26a-4f58-9e2c-bd0a31b54899"
    val categoryId = "52ca1a46-4561-470d-8e58-066f0670bb5f"
    val tagId = "be7b8a92-5c45-435a-9728-297a68e82c0e"
    val transactionId = "13ee04e4-874c-4bc6-a1ce-75b82c11f813"
    val repositories = BackupRepositories()
    val service = repositories.service()

    val result = service.execute(
      ImportMovementsBackupCommand(
        snapshot = MovementsBackupSnapshot(
          schemaVersion = 2,
          exportedAt = Instant.parse("2026-05-10T12:00:00Z"),
          accounts = listOf(
            BackupAccount(accountId, "Main", "cash", "EUR", "active"),
          ),
          categories = listOf(
            BackupCategory(categoryId, "Food", "expense", "active"),
          ),
          tags = listOf(
            BackupTag(tagId, "home", "active"),
          ),
          postedMovements = listOf(
            BackupPostedMovement(
              id = transactionId,
              accountId = accountId,
              type = "expense",
              status = "posted",
              occurredAt = Instant.parse("2026-05-09T10:00:00Z"),
              amount = "12.30",
              currency = "EUR",
              description = "Lunch",
              merchant = "Market",
              categoryId = categoryId,
              linkedTransactionId = null,
              splitItems = emptyList(),
              tagIds = listOf(tagId),
            ),
          ),
        ),
        importedAt = importedAt,
      ),
    )

    assertThat(result.importedCount).isEqualTo(1)
    assertThat(result.failedCount).isZero()
    assertThat(result.skippedCount).isZero()
    assertThat(repositories.accounts.findById(AccountId.from(accountId))?.name).isEqualTo("Main")

    val importedTransaction = repositories.transactions.findById(TransactionId.from(transactionId))
    assertThat(importedTransaction).isNotNull
    assertThat(importedTransaction!!.id).isEqualTo(TransactionId.from(transactionId))
    assertThat(importedTransaction.accountId).isEqualTo(AccountId.from(accountId))

    assertThat(repositories.categoryAssignments.findByTransactionId(UUID.fromString(transactionId))?.categoryId)
      .isEqualTo(CategoryId.from(categoryId))
    assertThat(repositories.tagAssignments.findByTransactionId(UUID.fromString(transactionId)).map { it.tagId })
      .containsExactly(TagId.from(tagId))
  }

  @Test
  fun `reimporting same backup skips existing movements`() {
    val repositories = BackupRepositories()
    val service = repositories.service()
    val snapshot = minimalBackupSnapshot()

    service.execute(ImportMovementsBackupCommand(snapshot, importedAt))
    val secondResult = service.execute(ImportMovementsBackupCommand(snapshot, importedAt))

    assertThat(secondResult.importedCount).isZero()
    assertThat(secondResult.skippedCount).isEqualTo(1)
    assertThat(secondResult.rows.single().status).isEqualTo(ImportMovementsBackupRowStatus.SKIPPED)
  }

  @Test
  fun `rejects unsupported schema versions`() {
    val service = BackupRepositories().service()

    assertThatThrownBy {
      service.execute(
        ImportMovementsBackupCommand(
          snapshot = minimalBackupSnapshot().copy(schemaVersion = 99),
          importedAt = importedAt,
        ),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("Unsupported backup schema version")
  }

  @Test
  fun `fails schema version one transfer rows because linked transaction is missing`() {
    val accountId = "7b7ef4ef-a26a-4f58-9e2c-bd0a31b54899"
    val transactionId = "13ee04e4-874c-4bc6-a1ce-75b82c11f813"
    val repositories = BackupRepositories()
    val service = repositories.service()

    val result = service.execute(
      ImportMovementsBackupCommand(
        snapshot = MovementsBackupSnapshot(
          schemaVersion = 1,
          exportedAt = Instant.parse("2026-05-10T12:00:00Z"),
          accounts = listOf(BackupAccount(accountId, "Main", "cash", "EUR", "active")),
          categories = emptyList(),
          tags = emptyList(),
          postedMovements = listOf(
            BackupPostedMovement(
              id = transactionId,
              accountId = accountId,
              type = "transfer_out",
              status = "posted",
              occurredAt = Instant.parse("2026-05-09T10:00:00Z"),
              amount = "12.30",
              currency = "EUR",
              description = "Move money",
              merchant = null,
              categoryId = null,
              linkedTransactionId = null,
              splitItems = emptyList(),
              tagIds = emptyList(),
            ),
          ),
        ),
        importedAt = importedAt,
      ),
    )

    assertThat(result.importedCount).isZero()
    assertThat(result.failedCount).isEqualTo(1)
    assertThat(result.rows.single().errorCode).isEqualTo("UNSUPPORTED_BACKUP_ROW")
    assertThat(repositories.transactions.findById(TransactionId.from(transactionId))).isNull()
  }

  private fun minimalBackupSnapshot(): MovementsBackupSnapshot =
    MovementsBackupSnapshot(
      schemaVersion = 2,
      exportedAt = Instant.parse("2026-05-10T12:00:00Z"),
      accounts = listOf(
        BackupAccount("7b7ef4ef-a26a-4f58-9e2c-bd0a31b54899", "Main", "cash", "EUR", "active"),
      ),
      categories = emptyList(),
      tags = emptyList(),
      postedMovements = listOf(
        BackupPostedMovement(
          id = "13ee04e4-874c-4bc6-a1ce-75b82c11f813",
          accountId = "7b7ef4ef-a26a-4f58-9e2c-bd0a31b54899",
          type = "income",
          status = "posted",
          occurredAt = Instant.parse("2026-05-09T10:00:00Z"),
          amount = "12.30",
          currency = "EUR",
          description = null,
          merchant = null,
          categoryId = null,
          linkedTransactionId = null,
          splitItems = emptyList(),
          tagIds = emptyList(),
        ),
      ),
    )
}

private class BackupRepositories {
  val accounts = MutableLedgerAccountRepository()
  val transactions = MutableLedgerTransactionRepository()
  val categories = MutableCategoryRepository()
  val tags = MutableTagRepository()
  val categoryAssignments = MutableTransactionCategoryAssignmentRepository()
  val tagAssignments = MutableTransactionTagAssignmentRepository()

  fun service(): ImportMovementsBackupService =
    ImportMovementsBackupService(
      accountRepository = accounts,
      transactionRepository = transactions,
      categoryRepository = categories,
      tagRepository = tags,
      categoryAssignmentRepository = categoryAssignments,
      tagAssignmentRepository = tagAssignments,
    )
}

private class MutableLedgerAccountRepository : LedgerAccountRepository {
  private val values = linkedMapOf<AccountId, Account>()

  override fun save(account: Account) {
    values[account.id] = account
  }

  override fun findById(id: AccountId): Account? = values[id]

  override fun exists(id: AccountId): Boolean = values.containsKey(id)

  override fun deleteById(id: AccountId) {
    values.remove(id)
  }

  override fun listAll(): List<Account> = values.values.toList()
}

private class MutableLedgerTransactionRepository : LedgerTransactionRepository {
  private val values = linkedMapOf<TransactionId, Transaction>()

  override fun save(transaction: Transaction) {
    values[transaction.id] = transaction
  }

  override fun findById(id: TransactionId): Transaction? = values[id]

  override fun findByAccount(accountId: AccountId, limit: Int?): List<Transaction> =
    values.values.filter { it.accountId == accountId }.let { if (limit == null) it else it.take(limit) }

  override fun findByAccountAndPeriod(accountId: AccountId, range: DateRange): List<Transaction> =
    values.values.filter { it.accountId == accountId && it.occurredAt >= range.from && it.occurredAt <= range.to }

  override fun findByAccountAndMerchant(accountId: AccountId, merchant: String): List<Transaction> =
    values.values.filter { it.accountId == accountId && it.merchant.equals(merchant, ignoreCase = true) }
}

private class MutableCategoryRepository : CategoryRepository {
  private val values = linkedMapOf<CategoryId, Category>()

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

private class MutableTagRepository : TagRepository {
  private val values = linkedMapOf<TagId, Tag>()

  override fun save(tag: Tag) {
    values[tag.id] = tag
  }

  override fun findById(id: TagId): Tag? = values[id]

  override fun findByIds(ids: Collection<TagId>): Map<TagId, Tag> =
    ids.mapNotNull { id -> values[id]?.let { id to it } }.toMap()

  override fun findByNormalizedName(name: String): Tag? =
    values.values.firstOrNull { it.name.equals(name.trim(), ignoreCase = true) }

  override fun listAll(): List<Tag> = values.values.toList()
}

private class MutableTransactionCategoryAssignmentRepository : TransactionCategoryAssignmentRepository {
  private val values = linkedMapOf<UUID, TransactionCategoryAssignment>()

  override fun upsert(assignment: TransactionCategoryAssignment) {
    values[assignment.transactionId] = assignment
  }

  override fun deleteByTransactionId(transactionId: UUID) {
    values.remove(transactionId)
  }

  override fun findByTransactionId(transactionId: UUID): TransactionCategoryAssignment? = values[transactionId]

  override fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, TransactionCategoryAssignment> =
    values.filterKeys(transactionIds::contains)
}

private class MutableTransactionTagAssignmentRepository : TransactionTagAssignmentRepository {
  private val values = linkedMapOf<UUID, List<TransactionTagAssignment>>()

  override fun replaceByTransactionId(transactionId: UUID, assignments: List<TransactionTagAssignment>) {
    values[transactionId] = assignments
  }

  override fun findByTransactionId(transactionId: UUID): List<TransactionTagAssignment> =
    values[transactionId].orEmpty()

  override fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, List<TransactionTagAssignment>> =
    values.filterKeys(transactionIds::contains)
}
