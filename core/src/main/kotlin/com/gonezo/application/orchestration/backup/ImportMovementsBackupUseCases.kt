package com.gonezo.application.orchestration.backup

import com.gonezo.ledger.domain.TransactionId
import java.time.Instant

data class MovementsBackupSnapshot(
  val schemaVersion: Int,
  val exportedAt: Instant?,
  val accounts: List<BackupAccount>,
  val categories: List<BackupCategory>,
  val tags: List<BackupTag>,
  val postedMovements: List<BackupPostedMovement>,
)

data class BackupAccount(
  val id: String,
  val name: String,
  val type: String,
  val currency: String,
  val status: String,
)

data class BackupCategory(
  val id: String,
  val name: String,
  val appliesTo: String,
  val status: String,
)

data class BackupTag(
  val id: String,
  val name: String,
  val status: String,
)

data class BackupPostedMovement(
  val id: String,
  val accountId: String,
  val type: String,
  val status: String,
  val occurredAt: Instant,
  val amount: String,
  val currency: String,
  val description: String?,
  val merchant: String?,
  val categoryId: String?,
  val linkedTransactionId: String?,
  val splitItems: List<BackupSplitItem>,
  val tagIds: List<String>,
)

data class BackupSplitItem(
  val id: String,
  val name: String,
  val amount: String,
  val currency: String,
  val note: String?,
)

data class ImportMovementsBackupCommand(
  val snapshot: MovementsBackupSnapshot,
  val importedAt: Instant,
)

enum class ImportMovementsBackupRowStatus {
  IMPORTED,
  FAILED,
  SKIPPED,
}

data class ImportMovementsBackupRowResult(
  val sourceLine: Int,
  val status: ImportMovementsBackupRowStatus,
  val transactionId: TransactionId? = null,
  val errorCode: String? = null,
  val errorMessage: String? = null,
)

data class ImportMovementsBackupResult(
  val rows: List<ImportMovementsBackupRowResult>,
) {
  val totalRows: Int = rows.size
  val importedCount: Int = rows.count { it.status == ImportMovementsBackupRowStatus.IMPORTED }
  val failedCount: Int = rows.count { it.status == ImportMovementsBackupRowStatus.FAILED }
  val skippedCount: Int = rows.count { it.status == ImportMovementsBackupRowStatus.SKIPPED }
}

interface ImportMovementsBackupUC {
  fun execute(command: ImportMovementsBackupCommand): ImportMovementsBackupResult
}
