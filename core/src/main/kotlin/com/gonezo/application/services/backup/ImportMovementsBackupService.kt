package com.gonezo.application.orchestration.backup

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.AccountStatus
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.ledger.domain.ports.LedgerAccountRepository
import com.gonezo.ledger.domain.ports.LedgerTransactionRepository
import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.CategoryStatus
import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TagStatus
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TagRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository
import java.time.Instant

class ImportMovementsBackupService(private val accountRepository: LedgerAccountRepository, private val transactionRepository: LedgerTransactionRepository, private val categoryRepository: CategoryRepository, private val tagRepository: TagRepository, private val categoryAssignmentRepository: TransactionCategoryAssignmentRepository, private val tagAssignmentRepository: TransactionTagAssignmentRepository, private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary, private val transactionFactory: BackupTransactionFactory = BackupTransactionFactory(accountRepository, categoryRepository), private val taxonomyAssignmentImporter: BackupTaxonomyAssignmentImporter = BackupTaxonomyAssignmentImporter(categoryRepository, tagRepository, categoryAssignmentRepository, tagAssignmentRepository)) : ImportMovementsBackupUC {
    override fun execute(command: ImportMovementsBackupCommand): ImportMovementsBackupResult = consistencyBoundary.withinConsistencyBoundary {
        require(command.snapshot.schemaVersion in SUPPORTED_SCHEMA_VERSIONS) {
            "Unsupported backup schema version: ${command.snapshot.schemaVersion}"
        }

        importAccounts(command.snapshot.accounts, command.importedAt)
        importCategories(command.snapshot.categories, command.importedAt)
        importTags(command.snapshot.tags, command.importedAt)

        val rows =
            command.snapshot.postedMovements.mapIndexed { index, movement ->
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

    private fun importMovement(sourceLine: Int, schemaVersion: Int, movement: BackupPostedMovement, importedAt: Instant): ImportMovementsBackupRowResult {
        val transactionId = TransactionId.from(movement.id)
        if (transactionRepository.findById(transactionId) != null) {
            return ImportMovementsBackupRowResult(
                sourceLine = sourceLine,
                status = ImportMovementsBackupRowStatus.SKIPPED,
                transactionId = transactionId,
            )
        }

        return try {
            val transaction = transactionFactory.create(schemaVersion, movement)
            transactionRepository.save(transaction)
            taxonomyAssignmentImporter.importFor(transaction, movement, importedAt)
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

    private companion object {
        val SUPPORTED_SCHEMA_VERSIONS = 1..2
    }
}
