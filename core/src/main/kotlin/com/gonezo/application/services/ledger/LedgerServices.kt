package com.gonezo.ledger.application

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.ledger.application.AddLedgerTransactionItemCommand
import com.gonezo.ledger.application.AddLedgerTransactionItemUC
import com.gonezo.ledger.application.ArchiveLedgerAccountCommand
import com.gonezo.ledger.application.ArchiveLedgerAccountUC
import com.gonezo.ledger.application.CreateLedgerExpenseDraftCommand
import com.gonezo.ledger.application.CreateLedgerExpenseDraftUC
import com.gonezo.ledger.application.DeleteLedgerAccountCommand
import com.gonezo.ledger.application.DeleteLedgerAccountUC
import com.gonezo.ledger.application.GetLedgerAccountBalanceQuery
import com.gonezo.ledger.application.GetLedgerAccountBalanceUC
import com.gonezo.ledger.application.ListLedgerAccountsUC
import com.gonezo.ledger.application.ListLedgerTransactionsQuery
import com.gonezo.ledger.application.ListLedgerTransactionsUC
import com.gonezo.ledger.application.OpenLedgerAccountCommand
import com.gonezo.ledger.application.OpenLedgerAccountUC
import com.gonezo.ledger.application.PostLedgerDraftTransactionCommand
import com.gonezo.ledger.application.PostLedgerDraftTransactionUC
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.application.RecordLedgerExpenseUC
import com.gonezo.ledger.application.RecordLedgerIncomeCommand
import com.gonezo.ledger.application.RecordLedgerIncomeUC
import com.gonezo.ledger.application.RecordLedgerTransferCommand
import com.gonezo.ledger.application.RecordLedgerTransferFxCommand
import com.gonezo.ledger.application.RecordLedgerTransferResult
import com.gonezo.ledger.application.RecordLedgerTransferFxUC
import com.gonezo.ledger.application.RecordLedgerTransferUC
import com.gonezo.ledger.application.RenameLedgerAccountCommand
import com.gonezo.ledger.application.RenameLedgerAccountUC
import com.gonezo.ledger.application.RestoreLedgerAccountCommand
import com.gonezo.ledger.application.RestoreLedgerAccountUC
import com.gonezo.ledger.application.VoidLedgerTransactionCommand
import com.gonezo.ledger.application.VoidLedgerTransactionUC
import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.ledger.domain.Transaction
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.ledger.domain.TransactionItem
import com.gonezo.ledger.domain.TransactionItemId
import com.gonezo.ledger.domain.TransactionType
import com.gonezo.ledger.domain.events.AccountArchived
import com.gonezo.ledger.domain.events.AccountOpened
import com.gonezo.ledger.domain.events.AccountRestored
import com.gonezo.ledger.domain.events.TransactionItemAdded
import com.gonezo.ledger.domain.events.TransactionRecorded
import com.gonezo.ledger.domain.events.TransactionVoided
import com.gonezo.ledger.domain.ports.LedgerAccountRepository
import com.gonezo.ledger.domain.ports.LedgerTransactionRepository
import com.gonezo.ledger.domain.services.BalanceCalculator
import com.gonezo.domain.shared.Money
import java.math.BigDecimal
import java.math.RoundingMode

class OpenLedgerAccountService(
  private val accountRepository: LedgerAccountRepository,
  private val transactionRepository: LedgerTransactionRepository,
  private val domainEventPublisher: DomainEventPublisher,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : OpenLedgerAccountUC {
  override fun execute(command: OpenLedgerAccountCommand): AccountId = consistencyBoundary.withinConsistencyBoundary {
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

    account.id
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

class RestoreLedgerAccountService(
  private val accountRepository: LedgerAccountRepository,
  private val domainEventPublisher: DomainEventPublisher,
) : RestoreLedgerAccountUC {
  override fun execute(command: RestoreLedgerAccountCommand) {
    val account = requireAccount(accountRepository, command.accountId)
    accountRepository.save(account.restore())
    domainEventPublisher.publish(AccountRestored(command.accountId))
  }
}

class DeleteLedgerAccountService(
  private val accountRepository: LedgerAccountRepository,
) : DeleteLedgerAccountUC {
  override fun execute(command: DeleteLedgerAccountCommand) {
    requireAccount(accountRepository, command.accountId)
    accountRepository.deleteById(command.accountId)
  }
}

class ListLedgerAccountsService(
  private val accountRepository: LedgerAccountRepository,
) : ListLedgerAccountsUC {
  override fun execute(): List<Account> = accountRepository.listAll()
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
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : RecordLedgerTransferUC {
  override fun execute(command: RecordLedgerTransferCommand): RecordLedgerTransferResult =
    consistencyBoundary.withinConsistencyBoundary {
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

      RecordLedgerTransferResult(
        transferOutId = transferOutId,
        transferInId = transferInId,
      )
    }
}

class RecordLedgerTransferFxService(
  private val accountRepository: LedgerAccountRepository,
  private val transactionRepository: LedgerTransactionRepository,
  private val domainEventPublisher: DomainEventPublisher,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : RecordLedgerTransferFxUC {
  override fun execute(command: RecordLedgerTransferFxCommand): RecordLedgerTransferResult =
    consistencyBoundary.withinConsistencyBoundary {
      require(command.fromAccountId != command.toAccountId) { "source and destination accounts must be different" }

      val fromAccount = requireAccount(accountRepository, command.fromAccountId)
      val toAccount = requireAccount(accountRepository, command.toAccountId)
      fromAccount.ensureCanRecordTransactions()
      toAccount.ensureCanRecordTransactions()

      val sourceAmount = requireAmountInAccountCurrency(fromAccount, command.sourceAmount)
      val destinationAmount = requireAmountInAccountCurrency(toAccount, command.destinationAmount)

      val providedExchangeRate = command.exchangeRate?.stripTrailingZeros()
      if (providedExchangeRate != null) {
        require(providedExchangeRate > BigDecimal.ZERO) { "exchange rate must be greater than 0" }
      }

      val normalizedSourceAmount = sourceAmount.amount.setScale(2, RoundingMode.HALF_UP)
      val normalizedDestinationAmount = destinationAmount.amount.setScale(2, RoundingMode.HALF_UP)
      require(normalizedSourceAmount > BigDecimal.ZERO) { "source amount must be greater than 0" }
      require(normalizedDestinationAmount > BigDecimal.ZERO) { "destination amount must be greater than 0" }
      val resolvedExchangeRate = providedExchangeRate
        ?: normalizedDestinationAmount.divide(normalizedSourceAmount, 10, RoundingMode.HALF_UP)

      if (sourceAmount.currency == destinationAmount.currency) {
        require(normalizedSourceAmount.compareTo(normalizedDestinationAmount) == 0) {
          "Same-currency transfer must keep equal source and destination amounts"
        }
        if (providedExchangeRate != null) {
          require(providedExchangeRate.compareTo(BigDecimal.ONE) == 0) {
            "Same-currency transfer exchange rate must be 1"
          }
        }
      } else {
        val expectedDestinationAmount = normalizedSourceAmount
          .multiply(resolvedExchangeRate)
          .setScale(2, RoundingMode.HALF_UP)
        require(expectedDestinationAmount.compareTo(normalizedDestinationAmount) == 0) {
          "Transfer amounts do not match exchange rate"
        }
      }

      val transferOutId = TransactionId.random()
      val transferInId = TransactionId.random()

      val transferOut = Transaction.recordTransferOut(
        id = transferOutId,
        accountId = fromAccount.id,
        amount = Money(normalizedSourceAmount, sourceAmount.currency.uppercase()),
        occurredAt = command.occurredAt,
        description = command.description,
        linkedTransactionId = transferInId,
      )
      val transferIn = Transaction.recordTransferIn(
        id = transferInId,
        accountId = toAccount.id,
        amount = Money(normalizedDestinationAmount, destinationAmount.currency.uppercase()),
        occurredAt = command.occurredAt,
        description = command.description,
        linkedTransactionId = transferOutId,
      )

      transactionRepository.save(transferOut)
      transactionRepository.save(transferIn)
      domainEventPublisher.publish(TransactionRecorded(transferOut.id, transferOut.accountId))
      domainEventPublisher.publish(TransactionRecorded(transferIn.id, transferIn.accountId))

      RecordLedgerTransferResult(
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
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : VoidLedgerTransactionUC {
  override fun execute(command: VoidLedgerTransactionCommand) {
    consistencyBoundary.withinConsistencyBoundary {
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
