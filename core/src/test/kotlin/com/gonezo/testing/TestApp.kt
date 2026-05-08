package com.gonezo.testing

import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.application.orchestration.DeleteLedgerAccountWorkflowService
import com.gonezo.domain.shared.DomainEvent
import com.gonezo.expected.application.CreateExpectedMovementService
import com.gonezo.expected.application.CreateExpectedMovementUC
import com.gonezo.expected.application.DismissExpectedMovementService
import com.gonezo.expected.application.DismissExpectedMovementUC
import com.gonezo.expected.application.ListExpectedMovementsService
import com.gonezo.expected.application.ListExpectedMovementsUC
import com.gonezo.expected.application.ResolveExpectedMovementService
import com.gonezo.expected.application.ResolveExpectedMovementUC
import com.gonezo.expected.infrastructure.persistence.JdbcExpectedMovementRepository
import com.gonezo.ledger.application.AddLedgerTransactionItemUC
import com.gonezo.ledger.application.CreateLedgerExpenseDraftUC
import com.gonezo.ledger.application.DeleteLedgerAccountUC
import com.gonezo.ledger.application.GetLedgerAccountBalanceUC
import com.gonezo.ledger.application.ListLedgerAccountsUC
import com.gonezo.ledger.application.ListLedgerTransactionsUC
import com.gonezo.ledger.application.OpenLedgerAccountUC
import com.gonezo.ledger.application.PostLedgerDraftTransactionUC
import com.gonezo.ledger.application.RecordLedgerExpenseUC
import com.gonezo.ledger.application.RecordLedgerIncomeUC
import com.gonezo.ledger.application.RecordLedgerTransferUC
import com.gonezo.ledger.application.RecordLedgerTransferFxUC
import com.gonezo.ledger.application.VoidLedgerTransactionUC
import com.gonezo.ledger.application.AddLedgerTransactionItemService
import com.gonezo.ledger.application.CreateLedgerExpenseDraftService
import com.gonezo.ledger.application.DeleteLedgerAccountService
import com.gonezo.ledger.application.GetLedgerAccountBalanceService
import com.gonezo.ledger.application.ListLedgerAccountsService
import com.gonezo.ledger.application.ListLedgerTransactionsService
import com.gonezo.ledger.application.OpenLedgerAccountService
import com.gonezo.ledger.application.PostLedgerDraftTransactionService
import com.gonezo.ledger.application.RecordLedgerExpenseService
import com.gonezo.ledger.application.RecordLedgerIncomeService
import com.gonezo.ledger.application.RecordLedgerTransferService
import com.gonezo.ledger.application.RecordLedgerTransferFxService
import com.gonezo.ledger.application.VoidLedgerTransactionService
import com.gonezo.ledger.infrastructure.persistence.JdbcLedgerAccountRepository
import com.gonezo.ledger.infrastructure.persistence.JdbcLedgerTransactionRepository
import com.gonezo.infrastructure.persistence.JdbcTxCategorizationStateRepository
import com.gonezo.infrastructure.transaction.JdbcConsistencyBoundary
import com.gonezo.taxonomy.infrastructure.persistence.JdbcTaxonomyTransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.infrastructure.persistence.JdbcTaxonomyTransactionTagAssignmentRepository
import org.springframework.jdbc.datasource.DataSourceTransactionManager
import org.springframework.transaction.support.TransactionTemplate

class TestApp(private val db: TestDatabase) {
  private val namedJdbc = db.namedJdbcTemplate
  private val consistencyBoundary = JdbcConsistencyBoundary(
    TransactionTemplate(DataSourceTransactionManager(db.dataSource)),
  )

  val ledgerAccountRepository = JdbcLedgerAccountRepository(namedJdbc)
  val ledgerTransactionRepository = JdbcLedgerTransactionRepository(namedJdbc)
  val expectedMovementRepository = JdbcExpectedMovementRepository(namedJdbc)
  val taxonomyTransactionCategoryAssignmentRepository = JdbcTaxonomyTransactionCategoryAssignmentRepository(namedJdbc)
  val taxonomyTransactionTagAssignmentRepository = JdbcTaxonomyTransactionTagAssignmentRepository(namedJdbc)
  val txCategorizationStateRepository = JdbcTxCategorizationStateRepository(namedJdbc)

  private val domainEventPublisher: DomainEventPublisher = NoopDomainEventPublisher()
  private val ledgerDeleteAccountService: DeleteLedgerAccountUC = DeleteLedgerAccountService(ledgerAccountRepository)

  val ledgerOpenAccountUC: OpenLedgerAccountUC = OpenLedgerAccountService(
    ledgerAccountRepository,
    ledgerTransactionRepository,
    domainEventPublisher,
  )
  val ledgerListAccountsUC: ListLedgerAccountsUC = ListLedgerAccountsService(ledgerAccountRepository)
  val ledgerDeleteAccountUC: DeleteLedgerAccountUC = DeleteLedgerAccountWorkflowService(
    ledgerTransactionRepository,
    taxonomyTransactionCategoryAssignmentRepository,
    taxonomyTransactionTagAssignmentRepository,
    txCategorizationStateRepository,
    ledgerDeleteAccountService,
    consistencyBoundary,
  )
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
  val ledgerRecordTransferFxUC: RecordLedgerTransferFxUC = RecordLedgerTransferFxService(
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
  val ledgerPostDraftTransactionUC: PostLedgerDraftTransactionUC = PostLedgerDraftTransactionService(
    ledgerTransactionRepository,
    domainEventPublisher,
  )
  val ledgerVoidTransactionUC: VoidLedgerTransactionUC = VoidLedgerTransactionService(
    ledgerTransactionRepository,
    domainEventPublisher,
  )
  val ledgerListTransactionsUC: ListLedgerTransactionsUC = ListLedgerTransactionsService(ledgerTransactionRepository)
  val ledgerGetAccountBalanceUC: GetLedgerAccountBalanceUC = GetLedgerAccountBalanceService(
    ledgerAccountRepository,
    ledgerTransactionRepository,
  )
  val expectedCreateMovementUC: CreateExpectedMovementUC = CreateExpectedMovementService(expectedMovementRepository)
  val expectedResolveMovementUC: ResolveExpectedMovementUC = ResolveExpectedMovementService(expectedMovementRepository)
  val expectedDismissMovementUC: DismissExpectedMovementUC = DismissExpectedMovementService(expectedMovementRepository)
  val expectedListMovementsUC: ListExpectedMovementsUC = ListExpectedMovementsService(expectedMovementRepository)
}

private class NoopDomainEventPublisher : DomainEventPublisher {
  override fun publish(event: DomainEvent) = Unit
}
