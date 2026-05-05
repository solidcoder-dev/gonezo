package com.gonezo.infrastructure.mobills

import com.gonezo.application.orchestration.mobills.ImportMobillsParseIssue
import com.gonezo.application.orchestration.mobills.ImportMobillsPolicy
import com.gonezo.application.orchestration.mobills.ImportMobillsResult
import com.gonezo.application.orchestration.mobills.ImportMobillsRow
import com.gonezo.application.orchestration.mobills.ImportMobillsStatementCommand
import com.gonezo.application.orchestration.mobills.ImportMobillsStatementUC
import java.time.Instant

class MobillsImportCoordinator(
  private val parser: MobillsTsvParser,
  private val importStatementUC: ImportMobillsStatementUC,
) {
  fun importBytes(
    bytes: ByteArray,
    requestedAt: Instant,
    policy: ImportMobillsPolicy = ImportMobillsPolicy(),
  ): ImportMobillsResult {
    val parsed = parser.parse(bytes)
    val command = ImportMobillsStatementCommand(
      rows = parsed.rows.map(::toImportRow),
      parseIssues = parsed.issues.map(::toParseIssue),
      policy = policy,
      requestedAt = requestedAt,
    )
    return importStatementUC.execute(command)
  }

  private fun toImportRow(row: MobillsNormalizedRow): ImportMobillsRow = ImportMobillsRow(
    sourceLine = row.sourceLine,
    accountName = row.accountName,
    occurredAt = row.occurredAt,
    value = row.value,
    currency = row.currency,
    description = row.description,
    merchant = row.merchant,
    category = row.category,
    tags = row.tags,
  )

  private fun toParseIssue(issue: MobillsParseIssue): ImportMobillsParseIssue = ImportMobillsParseIssue(
    lineNumber = issue.lineNumber,
    code = issue.code,
    message = issue.message,
  )
}

