package com.gonezo.testing

import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.application.ledger.AddLedgerTransactionItemUC
import com.gonezo.application.ledger.CreateLedgerExpenseDraftUC
import com.gonezo.application.ledger.GetLedgerAccountBalanceUC
import com.gonezo.application.ledger.GetLedgerTransactionUC
import com.gonezo.application.ledger.ListLedgerAccountsUC
import com.gonezo.application.ledger.ListLedgerTransactionsUC
import com.gonezo.application.ledger.OpenLedgerAccountUC
import com.gonezo.application.ledger.PostLedgerDraftTransactionUC
import com.gonezo.application.ledger.RecordLedgerExpenseUC
import com.gonezo.application.ledger.RecordLedgerIncomeUC
import com.gonezo.application.ledger.RecordLedgerTransferUC
import com.gonezo.application.ledger.RemoveLedgerTransactionItemUC
import com.gonezo.application.ledger.VoidLedgerTransactionUC
import com.gonezo.application.services.ledger.AddLedgerTransactionItemService
import com.gonezo.application.services.ledger.CreateLedgerExpenseDraftService
import com.gonezo.application.services.ledger.GetLedgerAccountBalanceService
import com.gonezo.application.services.ledger.GetLedgerTransactionService
import com.gonezo.application.services.ledger.ListLedgerAccountsService
import com.gonezo.application.services.ledger.ListLedgerTransactionsService
import com.gonezo.application.services.ledger.OpenLedgerAccountService
import com.gonezo.application.services.ledger.PostLedgerDraftTransactionService
import com.gonezo.application.services.ledger.RecordLedgerExpenseService
import com.gonezo.application.services.ledger.RecordLedgerIncomeService
import com.gonezo.application.services.ledger.RecordLedgerTransferService
import com.gonezo.application.services.ledger.RemoveLedgerTransactionItemService
import com.gonezo.application.services.ledger.VoidLedgerTransactionService
import com.gonezo.infrastructure.persistence.JdbcLedgerAccountRepository
import com.gonezo.infrastructure.persistence.JdbcLedgerTransactionRepository

class TestApp(private val db: TestDatabase) {
  private val namedJdbc = db.namedJdbcTemplate

  val ledgerAccountRepository = JdbcLedgerAccountRepository(namedJdbc)
  val ledgerTransactionRepository = JdbcLedgerTransactionRepository(namedJdbc)

  private val domainEventPublisher: DomainEventPublisher = NoopDomainEventPublisher()

  val ledgerOpenAccountUC: OpenLedgerAccountUC = OpenLedgerAccountService(
    ledgerAccountRepository,
    domainEventPublisher,
  )
  val ledgerListAccountsUC: ListLedgerAccountsUC = ListLedgerAccountsService(ledgerAccountRepository)
  val ledgerRecordIncomeUC: RecordLedgerIncomeUC = RecordLedgerIncomeService(
    ledgerAccountRepository,
    ledgerTransactionRepository,
    domainEventPublisher,
  )
  val ledgerRecordExpenseUC: RecordLedgerExpenseUC = RecordLedgerExpenseService(
    ledgerAccountRepository,
    ledgerTransactionRepository,
    domainEventPublisher,
  )
  val ledgerRecordTransferUC: RecordLedgerTransferUC = RecordLedgerTransferService(
    ledgerAccountRepository,
    ledgerTransactionRepository,
    domainEventPublisher,
  )
  val ledgerCreateExpenseDraftUC: CreateLedgerExpenseDraftUC = CreateLedgerExpenseDraftService(
    ledgerAccountRepository,
    ledgerTransactionRepository,
  )
  val ledgerAddTransactionItemUC: AddLedgerTransactionItemUC = AddLedgerTransactionItemService(
    ledgerTransactionRepository,
    domainEventPublisher,
  )
  val ledgerRemoveTransactionItemUC: RemoveLedgerTransactionItemUC = RemoveLedgerTransactionItemService(
    ledgerTransactionRepository,
  )
  val ledgerPostDraftTransactionUC: PostLedgerDraftTransactionUC = PostLedgerDraftTransactionService(
    ledgerTransactionRepository,
    domainEventPublisher,
  )
  val ledgerVoidTransactionUC: VoidLedgerTransactionUC = VoidLedgerTransactionService(
    ledgerTransactionRepository,
    domainEventPublisher,
  )
  val ledgerGetTransactionUC: GetLedgerTransactionUC = GetLedgerTransactionService(ledgerTransactionRepository)
  val ledgerListTransactionsUC: ListLedgerTransactionsUC = ListLedgerTransactionsService(ledgerTransactionRepository)
  val ledgerGetAccountBalanceUC: GetLedgerAccountBalanceUC = GetLedgerAccountBalanceService(
    ledgerAccountRepository,
    ledgerTransactionRepository,
  )
}

private class NoopDomainEventPublisher : DomainEventPublisher {
  override fun publish(event: Any) = Unit
}
