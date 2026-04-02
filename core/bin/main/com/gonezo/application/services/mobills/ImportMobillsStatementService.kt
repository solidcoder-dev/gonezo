package com.gonezo.application.orchestration.mobills

import com.gonezo.application.orchestration.ApplyTransactionTagsCommand
import com.gonezo.application.orchestration.ApplyTransactionTagsUC
import com.gonezo.application.orchestration.CategorizeLedgerTransactionCommand
import com.gonezo.application.orchestration.CategorizeLedgerTransactionUC
import com.gonezo.ledger.application.ListLedgerAccountsUC
import com.gonezo.ledger.application.OpenLedgerAccountCommand
import com.gonezo.ledger.application.OpenLedgerAccountUC
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.application.RecordLedgerExpenseUC
import com.gonezo.ledger.application.RecordLedgerIncomeCommand
import com.gonezo.ledger.application.RecordLedgerIncomeUC
import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.domain.shared.Money
import com.gonezo.taxonomy.application.ListCategoriesUC
import com.gonezo.taxonomy.domain.CategoryId
import java.time.Instant

class ImportMobillsStatementService(
  private val listAccountsUC: ListLedgerAccountsUC,
  private val openAccountUC: OpenLedgerAccountUC,
  private val recordExpenseUC: RecordLedgerExpenseUC,
  private val recordIncomeUC: RecordLedgerIncomeUC,
  private val listCategoriesUC: ListCategoriesUC,
  private val categorizeLedgerTransactionUC: CategorizeLedgerTransactionUC,
  private val applyTransactionTagsUC: ApplyTransactionTagsUC,
) : ImportMobillsStatementUC {
  override fun execute(command: ImportMobillsStatementCommand): ImportMobillsResult {
    val accountIndex = listAccountsUC.execute()
      .associateBy { accountKey(it.name, it.currency.value) }
      .toMutableMap()
    val categoryIndex = listCategoriesUC.execute()
      .associate { category -> categoryKey(category.name, category.appliesTo.value) to category.id }
      .toMutableMap()
    val results = mutableListOf<ImportMobillsRowResult>()

    command.parseIssues.forEach { parseIssue ->
      results += ImportMobillsRowResult(
        sourceLine = parseIssue.lineNumber,
        status = ImportMobillsRowStatus.FAILED,
        errorCode = parseIssue.code,
        errorMessage = parseIssue.message,
      )
    }

    command.rows.sortedBy { it.sourceLine }.forEach { row ->
      val outcome = runCatching {
        importRow(
          row = row,
          requestedAt = command.requestedAt,
          policy = command.policy,
          accountIndex = accountIndex,
          categoryIndex = categoryIndex,
        )
      }

      if (outcome.isSuccess) {
        results += ImportMobillsRowResult(
          sourceLine = row.sourceLine,
          status = ImportMobillsRowStatus.IMPORTED,
          transactionId = outcome.getOrNull(),
        )
      } else {
        val failure = outcome.exceptionOrNull()!!
        results += ImportMobillsRowResult(
          sourceLine = row.sourceLine,
          status = ImportMobillsRowStatus.FAILED,
          errorCode = toErrorCode(failure),
          errorMessage = failure.message ?: "Import failed",
        )
      }
    }

    return ImportMobillsResult(rows = results.sortedBy { it.sourceLine })
  }

  private fun importRow(
    row: ImportMobillsRow,
    requestedAt: Instant,
    policy: ImportMobillsPolicy,
    accountIndex: MutableMap<String, Account>,
    categoryIndex: MutableMap<String, CategoryId>,
  ): TransactionId {
    require(row.value.signum() != 0) { "ZERO_VALUE" }

    val currencyCode = CurrencyCode.from(row.currency)
    val account = resolveAccount(row, requestedAt, policy, accountIndex, currencyCode)
    val amount = Money(row.value.abs(), currencyCode.value)
    val transactionType = if (row.value.signum() < 0) "expense" else "income"

    val transactionId = if (transactionType == "expense") {
      recordExpenseUC.execute(
        RecordLedgerExpenseCommand(
          accountId = account.id,
          amount = amount,
          occurredAt = row.occurredAt,
          description = row.description,
          merchant = row.merchant,
        ),
      )
    } else {
      recordIncomeUC.execute(
        RecordLedgerIncomeCommand(
          accountId = account.id,
          amount = amount,
          occurredAt = row.occurredAt,
          description = row.description,
          merchant = row.merchant,
        ),
      )
    }

    val normalizedCategory = row.category?.trim().orEmpty()
    if (normalizedCategory.isNotBlank()) {
      val key = categoryKey(normalizedCategory, transactionType)
      val resolvedCategoryId = categoryIndex[key]
      if (resolvedCategoryId == null) {
        require(policy.createMissingCategories) {
          "CATEGORY_AUTOCREATE_DISABLED"
        }
      }

      val categorizationState = categorizeLedgerTransactionUC.execute(
        CategorizeLedgerTransactionCommand(
          transactionId = transactionId,
          transactionType = transactionType,
          categoryId = resolvedCategoryId,
          newCategoryName = if (resolvedCategoryId == null) normalizedCategory else null,
          requestedAt = requestedAt,
        ),
      )
      val assignedCategoryId = categorizationState.requestedCategoryId ?: resolvedCategoryId
      if (assignedCategoryId != null) {
        categoryIndex[key] = assignedCategoryId
      }
    }

    val normalizedTags = row.tags.map(String::trim).filter(String::isNotBlank)
    if (normalizedTags.isNotEmpty()) {
      require(policy.createMissingTags) {
        "TAG_AUTOCREATE_DISABLED"
      }
      applyTransactionTagsUC.execute(
        ApplyTransactionTagsCommand(
          transactionId = transactionId,
          tagNames = normalizedTags,
          requestedAt = requestedAt,
        ),
      )
    }

    return transactionId
  }

  private fun resolveAccount(
    row: ImportMobillsRow,
    requestedAt: Instant,
    policy: ImportMobillsPolicy,
    accountIndex: MutableMap<String, Account>,
    currencyCode: CurrencyCode,
  ): Account {
    val key = accountKey(row.accountName, currencyCode.value)
    val existing = accountIndex[key]
    if (existing != null) {
      return existing
    }

    require(policy.createMissingAccounts) { "ACCOUNT_NOT_FOUND:${row.accountName}:${currencyCode.value}" }

    val openedAccountId = openAccountUC.execute(
      OpenLedgerAccountCommand(
        name = row.accountName,
        type = policy.defaultAccountType,
        currency = currencyCode,
        createdAt = requestedAt,
      ),
    )

    return Account.open(
      id = openedAccountId,
      name = row.accountName,
      type = policy.defaultAccountType,
      currency = currencyCode,
      createdAt = requestedAt,
    ).also { accountIndex[key] = it }
  }

  private fun accountKey(name: String, currency: String): String = "${name.trim().lowercase()}|${currency.trim().uppercase()}"
  private fun categoryKey(name: String, appliesTo: String): String = "${name.trim().lowercase()}|${appliesTo.trim().lowercase()}"

  private fun toErrorCode(throwable: Throwable): String {
    val raw = throwable.message?.trim().orEmpty()
    if (raw.isBlank()) {
      return "IMPORT_FAILED"
    }
    val normalized = raw.uppercase().replace(Regex("[^A-Z0-9]+"), "_").trim('_')
    return if (normalized.isBlank()) "IMPORT_FAILED" else normalized
  }
}
