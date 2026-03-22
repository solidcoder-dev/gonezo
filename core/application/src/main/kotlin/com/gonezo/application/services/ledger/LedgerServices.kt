package com.gonezo.application.services.ledger

import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.application.ledger.AddLedgerTransactionItemCommand
import com.gonezo.application.ledger.AddLedgerTransactionItemUC
import com.gonezo.application.ledger.ArchiveLedgerAccountCommand
import com.gonezo.application.ledger.ArchiveLedgerAccountUC
import com.gonezo.application.ledger.CreateLedgerExpenseDraftCommand
import com.gonezo.application.ledger.CreateLedgerExpenseDraftUC
import com.gonezo.application.ledger.GetLedgerAccountBalanceQuery
import com.gonezo.application.ledger.GetLedgerAccountBalanceUC
import com.gonezo.application.ledger.GetLedgerTransactionQuery
import com.gonezo.application.ledger.GetLedgerTransactionUC
import com.gonezo.application.ledger.ListLedgerAccountsUC
import com.gonezo.application.ledger.ListLedgerSupportedCurrenciesUC
import com.gonezo.application.ledger.ListLedgerTransactionsQuery
import com.gonezo.application.ledger.ListLedgerTransactionsUC
import com.gonezo.application.ledger.OpenLedgerAccountCommand
import com.gonezo.application.ledger.OpenLedgerAccountUC
import com.gonezo.application.ledger.PostLedgerDraftTransactionCommand
import com.gonezo.application.ledger.PostLedgerDraftTransactionUC
import com.gonezo.application.ledger.RecordLedgerExpenseCommand
import com.gonezo.application.ledger.RecordLedgerExpenseUC
import com.gonezo.application.ledger.RecordLedgerIncomeCommand
import com.gonezo.application.ledger.RecordLedgerIncomeUC
import com.gonezo.application.ledger.RecordLedgerTransferCommand
import com.gonezo.application.ledger.RecordLedgerTransferResult
import com.gonezo.application.ledger.RecordLedgerTransferUC
import com.gonezo.application.ledger.RemoveLedgerTransactionItemCommand
import com.gonezo.application.ledger.RemoveLedgerTransactionItemUC
import com.gonezo.application.ledger.RenameLedgerAccountCommand
import com.gonezo.application.ledger.RenameLedgerAccountUC
import com.gonezo.application.ledger.VoidLedgerTransactionCommand
import com.gonezo.application.ledger.VoidLedgerTransactionUC
import com.gonezo.domain.ledger.Account
import com.gonezo.domain.ledger.AccountId
import com.gonezo.domain.ledger.CurrencyCode
import com.gonezo.domain.ledger.Transaction
import com.gonezo.domain.ledger.TransactionId
import com.gonezo.domain.ledger.TransactionItem
import com.gonezo.domain.ledger.TransactionItemId
import com.gonezo.domain.ledger.TransactionType
import com.gonezo.domain.ledger.events.AccountArchived
import com.gonezo.domain.ledger.events.AccountOpened
import com.gonezo.domain.ledger.events.TransactionItemAdded
import com.gonezo.domain.ledger.events.TransactionRecorded
import com.gonezo.domain.ledger.events.TransactionVoided
import com.gonezo.domain.ledger.ports.LedgerAccountRepository
import com.gonezo.domain.ledger.ports.LedgerTransactionRepository
import com.gonezo.domain.ledger.services.BalanceCalculator
import com.gonezo.domain.shared.Money
import java.math.BigDecimal

class OpenLedgerAccountService(
  private val accountRepository: LedgerAccountRepository,
  private val transactionRepository: LedgerTransactionRepository,
  private val domainEventPublisher: DomainEventPublisher,
) : OpenLedgerAccountUC {
  override fun execute(command: OpenLedgerAccountCommand): AccountId {
    val account = Account.open(
      id = AccountId.random(),
      name = command.name,
      type = command.type,
      currency = command.currency,
      createdAt = command.createdAt,
    )
    accountRepository.save(account)
    domainEventPublisher.publish(AccountOpened(account.id))

    val openingAmount = command.openingBalanceAmount
    if (openingAmount != null && openingAmount.compareTo(BigDecimal.ZERO) != 0) {
      val openingTx = if (openingAmount.compareTo(BigDecimal.ZERO) > 0) {
        Transaction.recordIncome(
          id = TransactionId.random(),
          accountId = account.id,
          amount = Money(openingAmount, account.currency.value),
          occurredAt = command.createdAt,
          description = "Opening balance",
          merchant = null,
        )
      } else {
        Transaction.recordExpense(
          id = TransactionId.random(),
          accountId = account.id,
          amount = Money(openingAmount.abs(), account.currency.value),
          occurredAt = command.createdAt,
          description = "Opening balance",
          merchant = null,
        )
      }
      transactionRepository.save(openingTx)
      domainEventPublisher.publish(TransactionRecorded(openingTx.id, openingTx.accountId))
    }

    return account.id
  }
}

class RenameLedgerAccountService(
  private val accountRepository: LedgerAccountRepository,
) : RenameLedgerAccountUC {
  override fun execute(command: RenameLedgerAccountCommand) {
    val account = requireAccount(accountRepository, command.accountId)
    accountRepository.save(account.rename(command.name))
  }
}

class ArchiveLedgerAccountService(
  private val accountRepository: LedgerAccountRepository,
  private val domainEventPublisher: DomainEventPublisher,
) : ArchiveLedgerAccountUC {
  override fun execute(command: ArchiveLedgerAccountCommand) {
    val account = requireAccount(accountRepository, command.accountId)
    accountRepository.save(account.archive(command.archivedAt))
    domainEventPublisher.publish(AccountArchived(command.accountId))
  }
}

class ListLedgerAccountsService(
  private val accountRepository: LedgerAccountRepository,
) : ListLedgerAccountsUC {
  override fun execute(): List<Account> = accountRepository.listAll()
}

class ListLedgerSupportedCurrenciesService : ListLedgerSupportedCurrenciesUC {
  override fun execute(): List<CurrencyCode> = CurrencyCode.supported()
}

class RecordLedgerIncomeService(
  private val accountRepository: LedgerAccountRepository,
  private val transactionRepository: LedgerTransactionRepository,
  private val domainEventPublisher: DomainEventPublisher,
) : RecordLedgerIncomeUC {
  override fun execute(command: RecordLedgerIncomeCommand): TransactionId {
    val account = requireAccount(accountRepository, command.accountId)
    account.ensureCanRecordTransactions()
    val amount = requireAmountInAccountCurrency(account, command.amount)
    val transaction = Transaction.recordIncome(
      id = TransactionId.random(),
      accountId = account.id,
      amount = amount,
      occurredAt = command.occurredAt,
      description = command.description,
      merchant = command.merchant,
    )
    transactionRepository.save(transaction)
    domainEventPublisher.publish(TransactionRecorded(transaction.id, transaction.accountId))
    return transaction.id
  }
}

class RecordLedgerExpenseService(
  private val accountRepository: LedgerAccountRepository,
  private val transactionRepository: LedgerTransactionRepository,
  private val domainEventPublisher: DomainEventPublisher,
) : RecordLedgerExpenseUC {
  override fun execute(command: RecordLedgerExpenseCommand): TransactionId {
    val account = requireAccount(accountRepository, command.accountId)
    account.ensureCanRecordTransactions()
    val amount = requireAmountInAccountCurrency(account, command.amount)
    val transaction = Transaction.recordExpense(
      id = TransactionId.random(),
      accountId = account.id,
      amount = amount,
      occurredAt = command.occurredAt,
      description = command.description,
      merchant = command.merchant,
    )
    transactionRepository.save(transaction)
    domainEventPublisher.publish(TransactionRecorded(transaction.id, transaction.accountId))
    return transaction.id
  }
}

class RecordLedgerTransferService(
  private val accountRepository: LedgerAccountRepository,
  private val transactionRepository: LedgerTransactionRepository,
  private val domainEventPublisher: DomainEventPublisher,
) : RecordLedgerTransferUC {
  override fun execute(command: RecordLedgerTransferCommand): RecordLedgerTransferResult {
    require(command.fromAccountId != command.toAccountId) { "source and destination accounts must be different" }

    val fromAccount = requireAccount(accountRepository, command.fromAccountId)
    val toAccount = requireAccount(accountRepository, command.toAccountId)
    fromAccount.ensureCanRecordTransactions()
    toAccount.ensureCanRecordTransactions()

    val normalizedCurrency = command.amount.currency.uppercase()
    require(normalizedCurrency == fromAccount.currency.value) {
      "Transfer currency must match source account currency (${fromAccount.currency.value})"
    }
    require(normalizedCurrency == toAccount.currency.value) {
      "Transfer currency must match destination account currency (${toAccount.currency.value})"
    }

    val transferOutId = TransactionId.random()
    val transferInId = TransactionId.random()
    val normalizedAmount = Money(command.amount.amount, normalizedCurrency)

    val transferOut = Transaction.recordTransferOut(
      id = transferOutId,
      accountId = fromAccount.id,
      amount = normalizedAmount,
      occurredAt = command.occurredAt,
      description = command.description,
      linkedTransactionId = transferInId,
    )
    val transferIn = Transaction.recordTransferIn(
      id = transferInId,
      accountId = toAccount.id,
      amount = normalizedAmount,
      occurredAt = command.occurredAt,
      description = command.description,
      linkedTransactionId = transferOutId,
    )

    transactionRepository.save(transferOut)
    transactionRepository.save(transferIn)
    domainEventPublisher.publish(TransactionRecorded(transferOut.id, transferOut.accountId))
    domainEventPublisher.publish(TransactionRecorded(transferIn.id, transferIn.accountId))

    return RecordLedgerTransferResult(
      transferOutId = transferOutId,
      transferInId = transferInId,
    )
  }
}

class CreateLedgerExpenseDraftService(
  private val accountRepository: LedgerAccountRepository,
  private val transactionRepository: LedgerTransactionRepository,
) : CreateLedgerExpenseDraftUC {
  override fun execute(command: CreateLedgerExpenseDraftCommand): TransactionId {
    val account = requireAccount(accountRepository, command.accountId)
    account.ensureCanRecordTransactions()
    val amount = requireAmountInAccountCurrency(account, command.amount)
    val transaction = Transaction.createExpenseDraft(
      id = TransactionId.random(),
      accountId = account.id,
      amount = amount,
      occurredAt = command.occurredAt,
      description = command.description,
      merchant = command.merchant,
    )
    transactionRepository.save(transaction)
    return transaction.id
  }
}

class AddLedgerTransactionItemService(
  private val transactionRepository: LedgerTransactionRepository,
  private val domainEventPublisher: DomainEventPublisher,
) : AddLedgerTransactionItemUC {
  override fun execute(command: AddLedgerTransactionItemCommand) {
    val transaction = requireTransaction(transactionRepository, command.transactionId)
    val item = TransactionItem.create(
      id = TransactionItemId.random(),
      name = command.name,
      amount = Money(command.amount.amount, command.amount.currency.uppercase()),
      note = command.note,
    )
    val updated = transaction.addItem(item)
    transactionRepository.save(updated)
    domainEventPublisher.publish(TransactionItemAdded(updated.id, item.id))
  }
}

class RemoveLedgerTransactionItemService(
  private val transactionRepository: LedgerTransactionRepository,
) : RemoveLedgerTransactionItemUC {
  override fun execute(command: RemoveLedgerTransactionItemCommand) {
    val transaction = requireTransaction(transactionRepository, command.transactionId)
    transactionRepository.save(transaction.removeItem(command.itemId))
  }
}

class PostLedgerDraftTransactionService(
  private val transactionRepository: LedgerTransactionRepository,
  private val domainEventPublisher: DomainEventPublisher,
) : PostLedgerDraftTransactionUC {
  override fun execute(command: PostLedgerDraftTransactionCommand) {
    val transaction = requireTransaction(transactionRepository, command.transactionId)
    val posted = transaction.post()
    transactionRepository.save(posted)
    domainEventPublisher.publish(TransactionRecorded(posted.id, posted.accountId))
  }
}

class VoidLedgerTransactionService(
  private val transactionRepository: LedgerTransactionRepository,
  private val domainEventPublisher: DomainEventPublisher,
) : VoidLedgerTransactionUC {
  override fun execute(command: VoidLedgerTransactionCommand) {
    val transaction = requireTransaction(transactionRepository, command.transactionId)
    val voidedTransaction = transaction.void()
    transactionRepository.save(voidedTransaction)
    domainEventPublisher.publish(TransactionVoided(voidedTransaction.id))

    if (transaction.type == TransactionType.TRANSFER_OUT || transaction.type == TransactionType.TRANSFER_IN) {
      val linkedId = transaction.linkedTransactionId
      if (linkedId != null) {
        val linked = requireTransaction(transactionRepository, linkedId)
        if (linked.status != voidedTransaction.status) {
          val voidedLinked = linked.void()
          transactionRepository.save(voidedLinked)
          domainEventPublisher.publish(TransactionVoided(voidedLinked.id))
        }
      }
    }
  }
}

class GetLedgerTransactionService(
  private val transactionRepository: LedgerTransactionRepository,
) : GetLedgerTransactionUC {
  override fun execute(query: GetLedgerTransactionQuery): Transaction =
    requireTransaction(transactionRepository, query.transactionId)
}

class ListLedgerTransactionsService(
  private val transactionRepository: LedgerTransactionRepository,
) : ListLedgerTransactionsUC {
  override fun execute(query: ListLedgerTransactionsQuery): List<Transaction> {
    val transactions = when {
      query.range != null -> transactionRepository.findByAccountAndPeriod(query.accountId, query.range)
      !query.merchant.isNullOrBlank() -> transactionRepository.findByAccountAndMerchant(query.accountId, query.merchant)
      else -> transactionRepository.findByAccount(query.accountId, query.limit)
    }

    return transactions
      .filter { tx -> query.range == null || (!tx.occurredAt.isBefore(query.range.from) && !tx.occurredAt.isAfter(query.range.to)) }
      .filter { tx -> query.merchant.isNullOrBlank() || tx.merchant.equals(query.merchant, ignoreCase = true) }
      .sortedByDescending { it.occurredAt }
      .let { list -> query.limit?.let { list.take(it) } ?: list }
  }
}

class GetLedgerAccountBalanceService(
  private val accountRepository: LedgerAccountRepository,
  private val transactionRepository: LedgerTransactionRepository,
  private val balanceCalculator: BalanceCalculator = BalanceCalculator(),
) : GetLedgerAccountBalanceUC {
  override fun execute(query: GetLedgerAccountBalanceQuery): Money {
    val account = requireAccount(accountRepository, query.accountId)
    val transactions = transactionRepository.findByAccount(query.accountId, null)
    return balanceCalculator.calculate(account.currency.value, transactions)
  }
}

private fun requireAccount(repository: LedgerAccountRepository, accountId: AccountId): Account =
  repository.findById(accountId) ?: throw IllegalStateException("Account not found: $accountId")

private fun requireTransaction(repository: LedgerTransactionRepository, transactionId: TransactionId): Transaction =
  repository.findById(transactionId) ?: throw IllegalStateException("Transaction not found: $transactionId")

private fun requireAmountInAccountCurrency(account: Account, amount: Money): Money {
  val normalizedCurrency = amount.currency.uppercase()
  require(normalizedCurrency == account.currency.value) {
    "Transaction currency must match account currency (${account.currency.value})"
  }
  return Money(amount = amount.amount, currency = normalizedCurrency)
}
