package com.gonezo.application.orchestration.backup

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.domain.shared.Money
import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.AccountStatus
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.ledger.domain.Transaction
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.ledger.domain.TransactionItem
import com.gonezo.ledger.domain.TransactionItemId
import com.gonezo.ledger.domain.TransactionStatus
import com.gonezo.ledger.domain.TransactionType
import com.gonezo.ledger.domain.ports.LedgerAccountRepository
import com.gonezo.ledger.domain.ports.LedgerTransactionRepository
import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.CategoryStatus
import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TagStatus
import com.gonezo.taxonomy.domain.TransactionCategoryAssignment
import com.gonezo.taxonomy.domain.TransactionTagAssignment
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TagRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository
import java.math.BigDecimal
import java.time.Instant

class ImportMovementsBackupService(
  private val accountRepository: LedgerAccountRepository,
  private val transactionRepository: LedgerTransactionRepository,
  private val categoryRepository: CategoryRepository,
  private val tagRepository: TagRepository,
  private val categoryAssignmentRepository: TransactionCategoryAssignmentRepository,
  private val tagAssignmentRepository: TransactionTagAssignmentRepository,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : ImportMovementsBackupUC {

  override fun execute(command: ImportMovementsBackupCommand): ImportMovementsBackupResult =
    consistencyBoundary.withinConsistencyBoundary {
      require(command.snapshot.schemaVersion in SUPPORTED_SCHEMA_VERSIONS) {
        "Unsupported backup schema version: ${command.snapshot.schemaVersion}"
      }

      importAccounts(command.snapshot.accounts, command.importedAt)
      importCategories(command.snapshot.categories, command.importedAt)
      importTags(command.snapshot.tags, command.importedAt)

      val rows = command.snapshot.postedMovements.mapIndexed { index, movement ->
        importMovement(
          sourceLine = index + 1,
          schemaVersion = command.snapshot.schemaVersion,
          movement = movement,
          importedAt = command.importedAt,
        )
      }

      ImportMovementsBackupResult(rows)
    }

  private fun importAccounts(accounts: List<BackupAccount>, importedAt: Instant) {
    accounts.forEach { item ->
      val id = AccountId.from(item.id)
      val status = AccountStatus.from(item.status)
      accountRepository.save(
        Account(
          id = id,
          name = item.name,
          type = AccountType.from(item.type),
          currency = CurrencyCode.from(item.currency),
          status = status,
          createdAt = importedAt,
          archivedAt = if (status == AccountStatus.ARCHIVED) importedAt else null,
        ),
      )
    }
  }

  private fun importCategories(categories: List<BackupCategory>, importedAt: Instant) {
    categories.forEach { item ->
      val id = CategoryId.from(item.id)
      val status = CategoryStatus.from(item.status)
      categoryRepository.save(
        Category(
          id = id,
          name = item.name,
          appliesTo = CategoryAppliesTo.from(item.appliesTo),
          status = status,
          createdAt = importedAt,
          archivedAt = if (status == CategoryStatus.ARCHIVED) importedAt else null,
        ),
      )
    }
  }

  private fun importTags(tags: List<BackupTag>, importedAt: Instant) {
    tags.forEach { item ->
      val id = TagId.from(item.id)
      val status = TagStatus.from(item.status)
      tagRepository.save(
        Tag(
          id = id,
          name = item.name,
          status = status,
          createdAt = importedAt,
          archivedAt = if (status == TagStatus.ARCHIVED) importedAt else null,
        ),
      )
    }
  }

  private fun importMovement(
    sourceLine: Int,
    schemaVersion: Int,
    movement: BackupPostedMovement,
    importedAt: Instant,
  ): ImportMovementsBackupRowResult {
    val transactionId = TransactionId.from(movement.id)
    if (transactionRepository.findById(transactionId) != null) {
      return ImportMovementsBackupRowResult(
        sourceLine = sourceLine,
        status = ImportMovementsBackupRowStatus.SKIPPED,
        transactionId = transactionId,
      )
    }

    return try {
      val transaction = toTransaction(schemaVersion, movement)
      transactionRepository.save(transaction)
      importTaxonomyAssignments(transaction, movement, importedAt)
      ImportMovementsBackupRowResult(
        sourceLine = sourceLine,
        status = ImportMovementsBackupRowStatus.IMPORTED,
        transactionId = transactionId,
      )
    } catch (error: BackupImportRowException) {
      ImportMovementsBackupRowResult(
        sourceLine = sourceLine,
        status = ImportMovementsBackupRowStatus.FAILED,
        errorCode = error.code,
        errorMessage = error.message,
      )
    } catch (error: RuntimeException) {
      ImportMovementsBackupRowResult(
        sourceLine = sourceLine,
        status = ImportMovementsBackupRowStatus.FAILED,
        errorCode = "IMPORT_FAILED",
        errorMessage = error.message ?: "Import failed",
      )
    }
  }

  private fun toTransaction(schemaVersion: Int, movement: BackupPostedMovement): Transaction {
    val type = TransactionType.from(movement.type)
    val linkedTransactionId = movement.linkedTransactionId?.trim()?.ifBlank { null }?.let(TransactionId::from)
    if (type.requiresLinkedTransaction() && (schemaVersion < 2 || linkedTransactionId == null)) {
      throw BackupImportRowException(
        code = "UNSUPPORTED_BACKUP_ROW",
        message = "Backup schema version $schemaVersion cannot import transfer row ${movement.id}",
      )
    }

    val accountId = AccountId.from(movement.accountId)
    if (!accountRepository.exists(accountId)) {
      throw BackupImportRowException(
        code = "ACCOUNT_NOT_FOUND",
        message = "Account not found: ${movement.accountId}",
      )
    }

    return Transaction(
      id = TransactionId.from(movement.id),
      accountId = accountId,
      type = type,
      amount = Money(BigDecimal(movement.amount), CurrencyCode.from(movement.currency).value),
      occurredAt = movement.occurredAt,
      description = movement.description,
      merchant = movement.merchant,
      status = TransactionStatus.from(movement.status),
      items = movement.splitItems.map { item ->
        TransactionItem(
          id = TransactionItemId.from(item.id),
          name = item.name,
          amount = Money(BigDecimal(item.amount), CurrencyCode.from(item.currency).value),
          note = item.note,
        )
      },
      linkedTransactionId = linkedTransactionId,
    )
  }

  private fun importTaxonomyAssignments(
    transaction: Transaction,
    movement: BackupPostedMovement,
    importedAt: Instant,
  ) {
    val categoryId = movement.categoryId?.trim()?.ifBlank { null }?.let(CategoryId::from)
    if (categoryId != null) {
      val category = categoryRepository.findById(categoryId)
        ?: throw BackupImportRowException("CATEGORY_NOT_FOUND", "Category not found: $categoryId")
      val expectedAppliesTo = transaction.type.categoryAppliesTo()
        ?: throw BackupImportRowException("CATEGORY_APPLIES_TO_MISMATCH", "Transfers cannot be categorized")
      if (category.appliesTo != expectedAppliesTo) {
        throw BackupImportRowException(
          "CATEGORY_APPLIES_TO_MISMATCH",
          "Category $categoryId applies to ${category.appliesTo.value}, received ${transaction.type.value}",
        )
      }
      categoryAssignmentRepository.upsert(
        TransactionCategoryAssignment.assign(
          transactionId = transaction.id.value,
          categoryId = categoryId,
          assignedAt = importedAt,
        ),
      )
    }

    val tagIds = movement.tagIds.mapNotNull { raw -> raw.trim().ifBlank { null }?.let(TagId::from) }
    if (tagIds.isNotEmpty()) {
      val tags = tagRepository.findByIds(tagIds)
      if (tags.size != tagIds.distinct().size) {
        val missing = tagIds.filterNot(tags::containsKey)
        throw BackupImportRowException("TAGS_NOT_FOUND", "Tags not found: ${missing.joinToString(",")}")
      }
      tagAssignmentRepository.replaceByTransactionId(
        transaction.id.value,
        tagIds.distinct().map { tagId ->
          TransactionTagAssignment.assign(
            transactionId = transaction.id.value,
            tagId = tagId,
            assignedAt = importedAt,
          )
        },
      )
    }
  }

  private fun TransactionType.requiresLinkedTransaction(): Boolean =
    this == TransactionType.TRANSFER_IN || this == TransactionType.TRANSFER_OUT

  private fun TransactionType.categoryAppliesTo(): CategoryAppliesTo? =
    when (this) {
      TransactionType.EXPENSE -> CategoryAppliesTo.EXPENSE
      TransactionType.INCOME -> CategoryAppliesTo.INCOME
      TransactionType.TRANSFER,
      TransactionType.TRANSFER_IN,
      TransactionType.TRANSFER_OUT,
      -> null
    }

  private class BackupImportRowException(
    val code: String,
    override val message: String,
  ) : RuntimeException(message)

  private companion object {
    val SUPPORTED_SCHEMA_VERSIONS = 1..2
  }
}
