package com.gonezo.ledger.application

import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.ledger.domain.DateRange
import com.gonezo.ledger.domain.Transaction
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.domain.shared.Money
import java.math.BigDecimal
import java.time.Instant

data class OpenLedgerAccountCommand(
  val name: String,
  val type: AccountType,
  val currency: CurrencyCode,
  val createdAt: Instant,
  val openingBalanceAmount: BigDecimal? = null,
)

interface OpenLedgerAccountUC {
  fun execute(command: OpenLedgerAccountCommand): AccountId
}

data class RenameLedgerAccountCommand(
  val accountId: AccountId,
  val name: String,
)

interface RenameLedgerAccountUC {
  fun execute(command: RenameLedgerAccountCommand)
}

data class ArchiveLedgerAccountCommand(
  val accountId: AccountId,
  val archivedAt: Instant,
)

interface ArchiveLedgerAccountUC {
  fun execute(command: ArchiveLedgerAccountCommand)
}

data class DeleteLedgerAccountCommand(
  val accountId: AccountId,
)

interface DeleteLedgerAccountUC {
  fun execute(command: DeleteLedgerAccountCommand)
}

interface ListLedgerAccountsUC {
  fun execute(): List<Account>
}

interface ListLedgerSupportedCurrenciesUC {
  fun execute(): List<CurrencyCode>
}

data class RecordLedgerIncomeCommand(
  val accountId: AccountId,
  val amount: Money,
  val occurredAt: Instant,
  val description: String?,
  val merchant: String?,
)

interface RecordLedgerIncomeUC {
  fun execute(command: RecordLedgerIncomeCommand): TransactionId
}

data class RecordLedgerExpenseCommand(
  val accountId: AccountId,
  val amount: Money,
  val occurredAt: Instant,
  val description: String?,
  val merchant: String?,
)

interface RecordLedgerExpenseUC {
  fun execute(command: RecordLedgerExpenseCommand): TransactionId
}

data class RecordLedgerTransferCommand(
  val fromAccountId: AccountId,
  val toAccountId: AccountId,
  val amount: Money,
  val occurredAt: Instant,
  val description: String?,
)

data class RecordLedgerTransferResult(
  val transferOutId: TransactionId,
  val transferInId: TransactionId,
)

interface RecordLedgerTransferUC {
  fun execute(command: RecordLedgerTransferCommand): RecordLedgerTransferResult
}

data class RecordLedgerTransferFxCommand(
  val fromAccountId: AccountId,
  val toAccountId: AccountId,
  val sourceAmount: Money,
  val destinationAmount: Money,
  val occurredAt: Instant,
  val description: String?,
  val exchangeRate: BigDecimal? = null,
)

interface RecordLedgerTransferFxUC {
  fun execute(command: RecordLedgerTransferFxCommand): RecordLedgerTransferResult
}

data class CreateLedgerExpenseDraftCommand(
  val accountId: AccountId,
  val amount: Money,
  val occurredAt: Instant,
  val description: String?,
  val merchant: String?,
)

interface CreateLedgerExpenseDraftUC {
  fun execute(command: CreateLedgerExpenseDraftCommand): TransactionId
}

data class AddLedgerTransactionItemCommand(
  val transactionId: TransactionId,
  val name: String,
  val amount: Money,
  val note: String?,
)

interface AddLedgerTransactionItemUC {
  fun execute(command: AddLedgerTransactionItemCommand)
}

data class RemoveLedgerTransactionItemCommand(
  val transactionId: TransactionId,
  val itemId: com.gonezo.ledger.domain.TransactionItemId,
)

interface RemoveLedgerTransactionItemUC {
  fun execute(command: RemoveLedgerTransactionItemCommand)
}

data class PostLedgerDraftTransactionCommand(
  val transactionId: TransactionId,
)

interface PostLedgerDraftTransactionUC {
  fun execute(command: PostLedgerDraftTransactionCommand)
}

data class VoidLedgerTransactionCommand(
  val transactionId: TransactionId,
)

interface VoidLedgerTransactionUC {
  fun execute(command: VoidLedgerTransactionCommand)
}

data class GetLedgerTransactionQuery(
  val transactionId: TransactionId,
)

interface GetLedgerTransactionUC {
  fun execute(query: GetLedgerTransactionQuery): Transaction
}

data class ListLedgerTransactionsQuery(
  val accountId: AccountId,
  val limit: Int? = null,
  val range: DateRange? = null,
  val merchant: String? = null,
)

interface ListLedgerTransactionsUC {
  fun execute(query: ListLedgerTransactionsQuery): List<Transaction>
}

data class GetLedgerAccountBalanceQuery(
  val accountId: AccountId,
)

interface GetLedgerAccountBalanceUC {
  fun execute(query: GetLedgerAccountBalanceQuery): Money
}
