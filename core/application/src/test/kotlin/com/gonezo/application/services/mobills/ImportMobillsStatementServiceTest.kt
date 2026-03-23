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
    val categorizeUC = RecordingCategorizeLedgerTransactionUC()
    val applyTagsUC = RecordingApplyTransactionTagsUC()
    val service = ImportMobillsStatementService(
      listAccountsUC = listAccountsUC,
      openAccountUC = openAccountUC,
      recordExpenseUC = recordExpenseUC,
      recordIncomeUC = recordIncomeUC,
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
}

private class StubListLedgerAccountsUC(
  private val accounts: List<Account>,
) : ListLedgerAccountsUC {
  override fun execute(): List<Account> = accounts
}

private class RecordingOpenLedgerAccountUC : OpenLedgerAccountUC {
  val calls = mutableListOf<com.gonezo.ledger.application.OpenLedgerAccountCommand>()

  override fun execute(command: com.gonezo.ledger.application.OpenLedgerAccountCommand): AccountId {
    calls += command
    return AccountId.random()
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

  override fun execute(command: CategorizeLedgerTransactionCommand): TxCategorizationState {
    calls += command
    return TxCategorizationState(
      transactionId = command.transactionId.value,
      requestedCategoryId = command.categoryId,
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

