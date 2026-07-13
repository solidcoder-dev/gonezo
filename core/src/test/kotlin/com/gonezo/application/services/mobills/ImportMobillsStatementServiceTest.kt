package com.gonezo.application.orchestration.mobills

import com.gonezo.application.orchestration.ApplyTransactionTagsCommand
import com.gonezo.application.orchestration.ApplyTransactionTagsResult
import com.gonezo.application.orchestration.ApplyTransactionTagsUC
import com.gonezo.application.orchestration.CategorizeLedgerTransactionCommand
import com.gonezo.application.orchestration.CategorizeLedgerTransactionUC
import com.gonezo.application.orchestration.CategorizationStatus
import com.gonezo.application.orchestration.TxCategorizationState
import com.gonezo.ledger.application.ListLedgerAccountsUC
import com.gonezo.ledger.application.OpenLedgerAccountUC
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.application.RecordLedgerExpenseUC
import com.gonezo.ledger.application.RecordLedgerIncomeCommand
import com.gonezo.ledger.application.RecordLedgerIncomeUC
import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.taxonomy.application.ListCategoriesUC
import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.CategoryWithUsage
import com.gonezo.taxonomy.domain.CategoryStatus
import com.gonezo.taxonomy.domain.TagId
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class ImportMobillsStatementServiceTest {

  @Test
  fun `routes normalized rows into ledger income and expense commands`() {
    val account = Account.open(
      id = AccountId.random(),
      name = "Wallet",
      type = AccountType.CASH,
      currency = CurrencyCode.from("EUR"),
      createdAt = Instant.parse("2026-03-20T10:00:00Z"),
    )
    val listAccountsUC = StubListLedgerAccountsUC(listOf(account))
    val openAccountUC = RecordingOpenLedgerAccountUC()
    val recordExpenseUC = RecordingRecordExpenseUC()
    val recordIncomeUC = RecordingRecordIncomeUC()
    val listCategoriesUC = StubListCategoriesUC()
    val categorizeUC = RecordingCategorizeLedgerTransactionUC()
    val applyTagsUC = RecordingApplyTransactionTagsUC()
    val service = ImportMobillsStatementService(
      listAccountsUC = listAccountsUC,
      openAccountUC = openAccountUC,
      recordExpenseUC = recordExpenseUC,
      recordIncomeUC = recordIncomeUC,
      listCategoriesUC = listCategoriesUC,
      categorizeLedgerTransactionUC = categorizeUC,
      applyTransactionTagsUC = applyTagsUC,
    )

    val result = service.execute(
      ImportMobillsStatementCommand(
        rows = listOf(
          ImportMobillsRow(
            sourceLine = 2,
            accountName = "Wallet",
            occurredAt = Instant.parse("2026-03-21T10:00:00Z"),
            value = BigDecimal("-12.50"),
            currency = "EUR",
            description = "Lunch",
            merchant = "Cafe",
            category = null,
            tags = emptyList(),
          ),
          ImportMobillsRow(
            sourceLine = 3,
            accountName = "Wallet",
            occurredAt = Instant.parse("2026-03-22T10:00:00Z"),
            value = BigDecimal("1500.00"),
            currency = "EUR",
            description = "Salary",
            merchant = "Employer",
            category = null,
            tags = emptyList(),
          ),
        ),
        requestedAt = Instant.parse("2026-03-22T12:00:00Z"),
      ),
    )

    assertThat(openAccountUC.calls).isEmpty()
    assertThat(recordExpenseUC.calls).hasSize(1)
    assertThat(recordExpenseUC.calls.single().amount.amount).isEqualByComparingTo("12.50")
    assertThat(recordIncomeUC.calls).hasSize(1)
    assertThat(recordIncomeUC.calls.single().amount.amount).isEqualByComparingTo("1500.00")

    assertThat(categorizeUC.calls).isEmpty()
    assertThat(applyTagsUC.calls).isEmpty()
    assertThat(result.totalRows).isEqualTo(2)
    assertThat(result.importedCount).isEqualTo(2)
    assertThat(result.failedCount).isEqualTo(0)
    assertThat(result.skippedCount).isEqualTo(0)
    assertThat(result.rows.map { it.status }).containsExactly(ImportMobillsRowStatus.IMPORTED, ImportMobillsRowStatus.IMPORTED)
  }

  @Test
  fun `fails row when account does not exist and account autocreate is disabled`() {
    val listAccountsUC = StubListLedgerAccountsUC(emptyList())
    val openAccountUC = RecordingOpenLedgerAccountUC()
    val recordExpenseUC = RecordingRecordExpenseUC()
    val recordIncomeUC = RecordingRecordIncomeUC()
    val listCategoriesUC = StubListCategoriesUC()
    val categorizeUC = RecordingCategorizeLedgerTransactionUC()
    val applyTagsUC = RecordingApplyTransactionTagsUC()
    val service = ImportMobillsStatementService(
      listAccountsUC = listAccountsUC,
      openAccountUC = openAccountUC,
      recordExpenseUC = recordExpenseUC,
      recordIncomeUC = recordIncomeUC,
      listCategoriesUC = listCategoriesUC,
      categorizeLedgerTransactionUC = categorizeUC,
      applyTransactionTagsUC = applyTagsUC,
    )

    val result = service.execute(
      ImportMobillsStatementCommand(
        rows = listOf(
          ImportMobillsRow(
            sourceLine = 7,
            accountName = "Unknown",
            occurredAt = Instant.parse("2026-03-24T10:00:00Z"),
            value = BigDecimal("-10.00"),
            currency = "EUR",
            description = "Lunch",
            merchant = "Cafe",
            category = null,
            tags = emptyList(),
          ),
        ),
        policy = ImportMobillsPolicy(createMissingAccounts = false),
        requestedAt = Instant.parse("2026-03-24T12:00:00Z"),
      ),
    )

    assertThat(openAccountUC.calls).isEmpty()
    assertThat(recordExpenseUC.calls).isEmpty()
    assertThat(recordIncomeUC.calls).isEmpty()
    assertThat(result.importedCount).isEqualTo(0)
    assertThat(result.failedCount).isEqualTo(1)
    assertThat(result.rows.single().errorCode).isEqualTo("ACCOUNT_NOT_FOUND_UNKNOWN_EUR")
  }

  @Test
  fun `creates missing account when policy enables account autocreate`() {
    val listAccountsUC = StubListLedgerAccountsUC(emptyList())
    val openAccountUC = RecordingOpenLedgerAccountUC(AccountId.random())
    val recordExpenseUC = RecordingRecordExpenseUC()
    val recordIncomeUC = RecordingRecordIncomeUC()
    val listCategoriesUC = StubListCategoriesUC()
    val categorizeUC = RecordingCategorizeLedgerTransactionUC()
    val applyTagsUC = RecordingApplyTransactionTagsUC()
    val service = ImportMobillsStatementService(
      listAccountsUC = listAccountsUC,
      openAccountUC = openAccountUC,
      recordExpenseUC = recordExpenseUC,
      recordIncomeUC = recordIncomeUC,
      listCategoriesUC = listCategoriesUC,
      categorizeLedgerTransactionUC = categorizeUC,
      applyTransactionTagsUC = applyTagsUC,
    )

    val result = service.execute(
      ImportMobillsStatementCommand(
        rows = listOf(
          ImportMobillsRow(
            sourceLine = 10,
            accountName = "Travel Card",
            occurredAt = Instant.parse("2026-03-24T10:00:00Z"),
            value = BigDecimal("-42.00"),
            currency = "EUR",
            description = "Taxi",
            merchant = "Cabify",
            category = null,
            tags = emptyList(),
          ),
        ),
        policy = ImportMobillsPolicy(createMissingAccounts = true),
        requestedAt = Instant.parse("2026-03-24T12:00:00Z"),
      ),
    )

    assertThat(openAccountUC.calls).hasSize(1)
    assertThat(openAccountUC.calls.single().name).isEqualTo("Travel Card")
    assertThat(recordExpenseUC.calls).hasSize(1)
    assertThat(result.importedCount).isEqualTo(1)
    assertThat(result.failedCount).isEqualTo(0)
  }

  @Test
  fun `reuses same auto created account for multiple rows`() {
    val listAccountsUC = StubListLedgerAccountsUC(emptyList())
    val openAccountUC = RecordingOpenLedgerAccountUC(AccountId.random())
    val recordExpenseUC = RecordingRecordExpenseUC()
    val recordIncomeUC = RecordingRecordIncomeUC()
    val listCategoriesUC = StubListCategoriesUC()
    val categorizeUC = RecordingCategorizeLedgerTransactionUC()
    val applyTagsUC = RecordingApplyTransactionTagsUC()
    val service = ImportMobillsStatementService(
      listAccountsUC = listAccountsUC,
      openAccountUC = openAccountUC,
      recordExpenseUC = recordExpenseUC,
      recordIncomeUC = recordIncomeUC,
      listCategoriesUC = listCategoriesUC,
      categorizeLedgerTransactionUC = categorizeUC,
      applyTransactionTagsUC = applyTagsUC,
    )

    service.execute(
      ImportMobillsStatementCommand(
        rows = listOf(
          ImportMobillsRow(
            sourceLine = 2,
            accountName = "Pocket",
            occurredAt = Instant.parse("2026-03-24T08:00:00Z"),
            value = BigDecimal("-5.00"),
            currency = "EUR",
            description = "Coffee",
            merchant = "Bar",
            category = null,
            tags = emptyList(),
          ),
          ImportMobillsRow(
            sourceLine = 3,
            accountName = "Pocket",
            occurredAt = Instant.parse("2026-03-24T09:00:00Z"),
            value = BigDecimal("20.00"),
            currency = "EUR",
            description = "Refund",
            merchant = "Bar",
            category = null,
            tags = emptyList(),
          ),
        ),
        policy = ImportMobillsPolicy(createMissingAccounts = true),
        requestedAt = Instant.parse("2026-03-24T12:00:00Z"),
      ),
    )

    assertThat(openAccountUC.calls).hasSize(1)
    assertThat(recordExpenseUC.calls).hasSize(1)
    assertThat(recordIncomeUC.calls).hasSize(1)
    assertThat(recordExpenseUC.calls.single().accountId).isEqualTo(recordIncomeUC.calls.single().accountId)
  }

  @Test
  fun `uses existing category id when category already exists`() {
    val account = Account.open(
      id = AccountId.random(),
      name = "Wallet",
      type = AccountType.CASH,
      currency = CurrencyCode.from("EUR"),
      createdAt = Instant.parse("2026-03-20T10:00:00Z"),
    )
    val existingCategory = Category(
      id = CategoryId.random(),
      name = "Food",
      appliesTo = CategoryAppliesTo.EXPENSE,
      status = CategoryStatus.ACTIVE,
      createdAt = Instant.parse("2026-03-20T10:00:00Z"),
      archivedAt = null,
    )
    val categorizeUC = RecordingCategorizeLedgerTransactionUC()
    val service = ImportMobillsStatementService(
      listAccountsUC = StubListLedgerAccountsUC(listOf(account)),
      openAccountUC = RecordingOpenLedgerAccountUC(),
      recordExpenseUC = RecordingRecordExpenseUC(),
      recordIncomeUC = RecordingRecordIncomeUC(),
      listCategoriesUC = StubListCategoriesUC(existingCategory),
      categorizeLedgerTransactionUC = categorizeUC,
      applyTransactionTagsUC = RecordingApplyTransactionTagsUC(),
    )

    service.execute(
      ImportMobillsStatementCommand(
        rows = listOf(
          ImportMobillsRow(
            sourceLine = 2,
            accountName = "Wallet",
            occurredAt = Instant.parse("2026-03-21T10:00:00Z"),
            value = BigDecimal("-12.50"),
            currency = "EUR",
            description = "Lunch",
            merchant = "Cafe",
            category = "Food",
            tags = emptyList(),
          ),
        ),
        requestedAt = Instant.parse("2026-03-22T12:00:00Z"),
      ),
    )

    val call = categorizeUC.calls.single()
    assertThat(call.categoryId).isEqualTo(existingCategory.id)
    assertThat(call.newCategoryName).isNull()
  }

  @Test
  fun `creates category once and reuses resolved id for next rows`() {
    val account = Account.open(
      id = AccountId.random(),
      name = "Wallet",
      type = AccountType.CASH,
      currency = CurrencyCode.from("EUR"),
      createdAt = Instant.parse("2026-03-20T10:00:00Z"),
    )
    val categorizeUC = RecordingCategorizeLedgerTransactionUC()
    val service = ImportMobillsStatementService(
      listAccountsUC = StubListLedgerAccountsUC(listOf(account)),
      openAccountUC = RecordingOpenLedgerAccountUC(),
      recordExpenseUC = RecordingRecordExpenseUC(),
      recordIncomeUC = RecordingRecordIncomeUC(),
      listCategoriesUC = StubListCategoriesUC(),
      categorizeLedgerTransactionUC = categorizeUC,
      applyTransactionTagsUC = RecordingApplyTransactionTagsUC(),
    )

    val result = service.execute(
      ImportMobillsStatementCommand(
        rows = listOf(
          ImportMobillsRow(
            sourceLine = 2,
            accountName = "Wallet",
            occurredAt = Instant.parse("2026-03-21T10:00:00Z"),
            value = BigDecimal("-12.50"),
            currency = "EUR",
            description = "Lunch",
            merchant = "Cafe",
            category = "Travel",
            tags = emptyList(),
          ),
          ImportMobillsRow(
            sourceLine = 3,
            accountName = "Wallet",
            occurredAt = Instant.parse("2026-03-22T10:00:00Z"),
            value = BigDecimal("-5.00"),
            currency = "EUR",
            description = "Tube",
            merchant = "TfL",
            category = "Travel",
            tags = emptyList(),
          ),
        ),
        requestedAt = Instant.parse("2026-03-22T12:00:00Z"),
      ),
    )

    assertThat(result.importedCount).isEqualTo(2)
    assertThat(categorizeUC.calls).hasSize(2)
    assertThat(categorizeUC.calls.first().newCategoryName).isEqualTo("Travel")
    assertThat(categorizeUC.calls.first().categoryId).isNull()
    assertThat(categorizeUC.calls.last().newCategoryName).isNull()
    assertThat(categorizeUC.calls.last().categoryId).isNotNull()
  }

  @Test
  fun `fails row when tag autocreate is disabled and tags are provided`() {
    val account = Account.open(
      id = AccountId.random(),
      name = "Wallet",
      type = AccountType.CASH,
      currency = CurrencyCode.from("EUR"),
      createdAt = Instant.parse("2026-03-20T10:00:00Z"),
    )
    val applyTagsUC = RecordingApplyTransactionTagsUC()
    val service = ImportMobillsStatementService(
      listAccountsUC = StubListLedgerAccountsUC(listOf(account)),
      openAccountUC = RecordingOpenLedgerAccountUC(),
      recordExpenseUC = RecordingRecordExpenseUC(),
      recordIncomeUC = RecordingRecordIncomeUC(),
      listCategoriesUC = StubListCategoriesUC(),
      categorizeLedgerTransactionUC = RecordingCategorizeLedgerTransactionUC(),
      applyTransactionTagsUC = applyTagsUC,
    )

    val result = service.execute(
      ImportMobillsStatementCommand(
        rows = listOf(
          ImportMobillsRow(
            sourceLine = 2,
            accountName = "Wallet",
            occurredAt = Instant.parse("2026-03-21T10:00:00Z"),
            value = BigDecimal("-12.50"),
            currency = "EUR",
            description = "Lunch",
            merchant = "Cafe",
            category = null,
            tags = listOf("trip"),
          ),
        ),
        policy = ImportMobillsPolicy(createMissingTags = false),
        requestedAt = Instant.parse("2026-03-22T12:00:00Z"),
      ),
    )

    assertThat(applyTagsUC.calls).isEmpty()
    assertThat(result.failedCount).isEqualTo(1)
    assertThat(result.rows.single().errorCode).isEqualTo("TAG_AUTOCREATE_DISABLED")
  }

  @Test
  fun `includes parser issues as failed rows and still imports valid rows`() {
    val account = Account.open(
      id = AccountId.random(),
      name = "Wallet",
      type = AccountType.CASH,
      currency = CurrencyCode.from("EUR"),
      createdAt = Instant.parse("2026-03-20T10:00:00Z"),
    )
    val service = ImportMobillsStatementService(
      listAccountsUC = StubListLedgerAccountsUC(listOf(account)),
      openAccountUC = RecordingOpenLedgerAccountUC(),
      recordExpenseUC = RecordingRecordExpenseUC(),
      recordIncomeUC = RecordingRecordIncomeUC(),
      listCategoriesUC = StubListCategoriesUC(),
      categorizeLedgerTransactionUC = RecordingCategorizeLedgerTransactionUC(),
      applyTransactionTagsUC = RecordingApplyTransactionTagsUC(),
    )

    val result = service.execute(
      ImportMobillsStatementCommand(
        rows = listOf(
          ImportMobillsRow(
            sourceLine = 3,
            accountName = "Wallet",
            occurredAt = Instant.parse("2026-03-21T10:00:00Z"),
            value = BigDecimal("-12.50"),
            currency = "EUR",
            description = "Lunch",
            merchant = "Cafe",
            category = null,
            tags = emptyList(),
          ),
        ),
        parseIssues = listOf(
          ImportMobillsParseIssue(
            lineNumber = 2,
            code = "INVALID_DATE",
            message = "Cannot parse date",
          ),
        ),
        requestedAt = Instant.parse("2026-03-22T12:00:00Z"),
      ),
    )

    assertThat(result.totalRows).isEqualTo(2)
    assertThat(result.failedCount).isEqualTo(1)
    assertThat(result.importedCount).isEqualTo(1)
    assertThat(result.rows.map { it.sourceLine }).containsExactly(2, 3)
    assertThat(result.rows.first().errorCode).isEqualTo("INVALID_DATE")
    assertThat(result.rows.last().status).isEqualTo(ImportMobillsRowStatus.IMPORTED)
  }

  @Test
  fun `continues importing next rows when one row fails`() {
    val account = Account.open(
      id = AccountId.random(),
      name = "Wallet",
      type = AccountType.CASH,
      currency = CurrencyCode.from("EUR"),
      createdAt = Instant.parse("2026-03-20T10:00:00Z"),
    )
    val service = ImportMobillsStatementService(
      listAccountsUC = StubListLedgerAccountsUC(listOf(account)),
      openAccountUC = RecordingOpenLedgerAccountUC(),
      recordExpenseUC = RecordingRecordExpenseUC(),
      recordIncomeUC = RecordingRecordIncomeUC(),
      listCategoriesUC = StubListCategoriesUC(),
      categorizeLedgerTransactionUC = RecordingCategorizeLedgerTransactionUC(),
      applyTransactionTagsUC = RecordingApplyTransactionTagsUC(),
    )

    val result = service.execute(
      ImportMobillsStatementCommand(
        rows = listOf(
          ImportMobillsRow(
            sourceLine = 2,
            accountName = "Wallet",
            occurredAt = Instant.parse("2026-03-21T10:00:00Z"),
            value = BigDecimal("-12.50"),
            currency = "ZZZ",
            description = "Lunch",
            merchant = "Cafe",
            category = null,
            tags = emptyList(),
          ),
          ImportMobillsRow(
            sourceLine = 3,
            accountName = "Wallet",
            occurredAt = Instant.parse("2026-03-22T10:00:00Z"),
            value = BigDecimal("100.00"),
            currency = "EUR",
            description = "Refund",
            merchant = "Cafe",
            category = null,
            tags = emptyList(),
          ),
        ),
        requestedAt = Instant.parse("2026-03-22T12:00:00Z"),
      ),
    )

    assertThat(result.totalRows).isEqualTo(2)
    assertThat(result.failedCount).isEqualTo(1)
    assertThat(result.importedCount).isEqualTo(1)
    assertThat(result.rows.map { it.status })
      .containsExactly(ImportMobillsRowStatus.FAILED, ImportMobillsRowStatus.IMPORTED)
  }
}

private class StubListLedgerAccountsUC(
  private val accounts: List<Account>,
) : ListLedgerAccountsUC {
  override fun execute(): List<Account> = accounts
}

private class StubListCategoriesUC(
  private vararg val categories: Category,
) : ListCategoriesUC {
  override fun execute(): List<CategoryWithUsage> = categories.map { CategoryWithUsage(it, 0) }
}

private class RecordingOpenLedgerAccountUC : OpenLedgerAccountUC {
  private val generatedAccountId: AccountId
  val calls = mutableListOf<com.gonezo.ledger.application.OpenLedgerAccountCommand>()

  constructor(generatedAccountId: AccountId = AccountId.random()) {
    this.generatedAccountId = generatedAccountId
  }

  override fun execute(command: com.gonezo.ledger.application.OpenLedgerAccountCommand): AccountId {
    calls += command
    return generatedAccountId
  }
}

private class RecordingRecordExpenseUC : RecordLedgerExpenseUC {
  val calls = mutableListOf<RecordLedgerExpenseCommand>()

  override fun execute(command: RecordLedgerExpenseCommand): TransactionId {
    calls += command
    return TransactionId.random()
  }
}

private class RecordingRecordIncomeUC : RecordLedgerIncomeUC {
  val calls = mutableListOf<RecordLedgerIncomeCommand>()

  override fun execute(command: RecordLedgerIncomeCommand): TransactionId {
    calls += command
    return TransactionId.random()
  }
}

private class RecordingCategorizeLedgerTransactionUC : CategorizeLedgerTransactionUC {
  val calls = mutableListOf<CategorizeLedgerTransactionCommand>()
  private val generatedCategoryByName = linkedMapOf<String, CategoryId>()

  override fun execute(command: CategorizeLedgerTransactionCommand): TxCategorizationState {
    calls += command
    val resolvedCategoryId = command.categoryId ?: command.newCategoryName?.let { name ->
      generatedCategoryByName.getOrPut(name.lowercase()) { CategoryId.random() }
    }
    return TxCategorizationState(
      transactionId = command.transactionId.value,
      requestedCategoryId = resolvedCategoryId,
      status = CategorizationStatus.NONE,
      errorCode = null,
      errorMessage = null,
      attempts = 0,
      nextAttemptAt = null,
      updatedAt = command.requestedAt,
      createdAt = command.requestedAt,
    )
  }
}

private class RecordingApplyTransactionTagsUC : ApplyTransactionTagsUC {
  val calls = mutableListOf<ApplyTransactionTagsCommand>()

  override fun execute(command: ApplyTransactionTagsCommand): ApplyTransactionTagsResult {
    calls += command
    return ApplyTransactionTagsResult(emptyList<TagId>())
  }
}
