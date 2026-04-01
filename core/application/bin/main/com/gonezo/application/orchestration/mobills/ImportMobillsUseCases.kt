package com.gonezo.application.orchestration.mobills

import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.TransactionId
import java.math.BigDecimal
import java.time.Instant

data class ImportMobillsRow(
  val sourceLine: Int,
  val accountName: String,
  val occurredAt: Instant,
  val value: BigDecimal,
  val currency: String,
  val description: String?,
  val merchant: String?,
  val category: String?,
  val tags: List<String>,
)

data class ImportMobillsParseIssue(
  val lineNumber: Int,
  val code: String,
  val message: String,
)

data class ImportMobillsPolicy(
  val createMissingAccounts: Boolean = false,
  val createMissingCategories: Boolean = true,
  val createMissingTags: Boolean = true,
  val defaultAccountType: AccountType = AccountType.CASH,
)

data class ImportMobillsStatementCommand(
  val rows: List<ImportMobillsRow>,
  val parseIssues: List<ImportMobillsParseIssue> = emptyList(),
  val policy: ImportMobillsPolicy = ImportMobillsPolicy(),
  val requestedAt: Instant,
)

enum class ImportMobillsRowStatus {
  IMPORTED,
  FAILED,
  SKIPPED,
}

data class ImportMobillsRowResult(
  val sourceLine: Int,
  val status: ImportMobillsRowStatus,
  val transactionId: TransactionId? = null,
  val errorCode: String? = null,
  val errorMessage: String? = null,
)

data class ImportMobillsResult(
  val rows: List<ImportMobillsRowResult>,
) {
  val totalRows: Int = rows.size
  val importedCount: Int = rows.count { it.status == ImportMobillsRowStatus.IMPORTED }
  val failedCount: Int = rows.count { it.status == ImportMobillsRowStatus.FAILED }
  val skippedCount: Int = rows.count { it.status == ImportMobillsRowStatus.SKIPPED }
}

interface ImportMobillsStatementUC {
  fun execute(command: ImportMobillsStatementCommand): ImportMobillsResult
}

