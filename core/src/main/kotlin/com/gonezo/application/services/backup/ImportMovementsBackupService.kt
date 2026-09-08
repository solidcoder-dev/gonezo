package com.gonezo.application.orchestration.backup

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.ledger.domain.ports.LedgerAccountRepository
import com.gonezo.ledger.domain.ports.LedgerTransactionRepository
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TagRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository
import java.time.Instant

class ImportMovementsBackupService(private val accountRepository: LedgerAccountRepository, private val transactionRepository: LedgerTransactionRepository, private val categoryRepository: CategoryRepository, private val tagRepository: TagRepository, private val categoryAssignmentRepository: TransactionCategoryAssignmentRepository, private val tagAssignmentRepository: TransactionTagAssignmentRepository, private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary, private val transactionFactory: BackupTransactionFactory = BackupTransactionFactory(accountRepository, categoryRepository), private val taxonomyAssignmentImporter: BackupTaxonomyAssignmentImporter = BackupTaxonomyAssignmentImporter(categoryRepository, tagRepository, categoryAssignmentRepository, tagAssignmentRepository), private val masterDataImporter: BackupMasterDataImporter = BackupMasterDataImporter(accountRepository, categoryRepository, tagRepository)) : ImportMovementsBackupUC {
    override fun execute(command: ImportMovementsBackupCommand): ImportMovementsBackupResult = consistencyBoundary.withinConsistencyBoundary {
        require(command.snapshot.schemaVersion in SUPPORTED_SCHEMA_VERSIONS) {
            "Unsupported backup schema version: ${command.snapshot.schemaVersion}"
        }

        masterDataImporter.importAccounts(command.snapshot.accounts, command.importedAt)
        masterDataImporter.importCategories(command.snapshot.categories, command.importedAt)
        masterDataImporter.importTags(command.snapshot.tags, command.importedAt)

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
