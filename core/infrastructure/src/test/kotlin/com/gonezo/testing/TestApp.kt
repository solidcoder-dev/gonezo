package com.gonezo.testing

import com.gonezo.application.AllocateBudgetUC
import com.gonezo.application.ClosePeriodUC
import com.gonezo.application.CreateAccountUC
import com.gonezo.application.CreateBudgetPeriodUC
import com.gonezo.application.CreatePeriodReservationsUC
import com.gonezo.application.ExecuteInvestmentUC
import com.gonezo.application.PostExpenseUC
import com.gonezo.application.PostIncomeUC
import com.gonezo.application.PostTransferUC
import com.gonezo.application.RecordInvestmentReturnUC
import com.gonezo.application.SettleReservationFromTxUC
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
import com.gonezo.application.ledger.RemoveLedgerTransactionItemUC
import com.gonezo.application.ledger.VoidLedgerTransactionUC
import com.gonezo.application.services.AllocateBudgetService
import com.gonezo.application.services.BudgetAttributionService
import com.gonezo.application.services.BudgetLinkImpactService
import com.gonezo.application.services.BudgetPeriodTotalsService
import com.gonezo.application.services.CategoryBalanceUpdaterService
import com.gonezo.application.services.ClosePeriodService
import com.gonezo.application.services.CreateAccountService
import com.gonezo.application.services.CreateBudgetPeriodService
import com.gonezo.application.services.CreatePeriodReservationsService
import com.gonezo.application.services.ExecuteInvestmentService
import com.gonezo.application.services.PostExpenseService
import com.gonezo.application.services.PostIncomeService
import com.gonezo.application.services.PostTransferService
import com.gonezo.application.services.RecordInvestmentReturnService
import com.gonezo.application.services.ReservationBalanceService
import com.gonezo.application.services.ReservationMatchingService
import com.gonezo.application.services.SettleReservationFromTxService
import com.gonezo.application.services.TransferBudgetImpactService
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
import com.gonezo.application.services.ledger.RemoveLedgerTransactionItemService
import com.gonezo.application.services.ledger.VoidLedgerTransactionService
import com.gonezo.domain.budgeting.services.BudgetAllocatorService
import com.gonezo.domain.budgeting.services.BudgetAllocatorServiceImpl
import com.gonezo.domain.budgeting.services.BudgetLinkService
import com.gonezo.domain.budgeting.services.BudgetLinkServiceImpl
import com.gonezo.domain.budgeting.services.PeriodClosingService
import com.gonezo.domain.budgeting.services.PeriodClosingServiceImpl
import com.gonezo.domain.budgeting.services.ReservationService
import com.gonezo.domain.budgeting.services.ReservationServiceImpl
import com.gonezo.domain.cashledger.services.LedgerPostingService
import com.gonezo.domain.cashledger.services.LedgerPostingServiceImpl
import com.gonezo.domain.investments.services.InvestmentExecutionService
import com.gonezo.domain.investments.services.InvestmentExecutionServiceImpl
import com.gonezo.infrastructure.persistence.JdbcAccountRepository
import com.gonezo.infrastructure.persistence.JdbcAllocationRuleRepository
import com.gonezo.infrastructure.persistence.JdbcAssetRepository
import com.gonezo.infrastructure.persistence.JdbcBudgetLinkRepository
import com.gonezo.infrastructure.persistence.JdbcBudgetPeriodRepository
import com.gonezo.infrastructure.persistence.JdbcBudgetPlanRepository
import com.gonezo.infrastructure.persistence.JdbcBudgetReservationRepository
import com.gonezo.infrastructure.persistence.JdbcCategoryBalanceRepository
import com.gonezo.infrastructure.persistence.JdbcCategoryRepository
import com.gonezo.infrastructure.persistence.JdbcFinancialContainerRepository
import com.gonezo.infrastructure.persistence.JdbcInvestmentTransactionRepository
import com.gonezo.infrastructure.persistence.JdbcLedgerAccountRepository
import com.gonezo.infrastructure.persistence.JdbcLedgerTransactionRepository
import com.gonezo.infrastructure.persistence.JdbcRecurringPatternRepository
import com.gonezo.infrastructure.persistence.JdbcTransactionRepository

class TestApp(private val db: TestDatabase) {
  private val namedJdbc = db.namedJdbcTemplate

  val accountRepository = JdbcAccountRepository(namedJdbc)
  val allocationRuleRepository = JdbcAllocationRuleRepository(namedJdbc)
  val assetRepository = JdbcAssetRepository(namedJdbc)
  val budgetLinkRepository = JdbcBudgetLinkRepository(namedJdbc)
  val budgetPeriodRepository = JdbcBudgetPeriodRepository(namedJdbc)
  val budgetPlanRepository = JdbcBudgetPlanRepository(namedJdbc)
  val budgetReservationRepository = JdbcBudgetReservationRepository(namedJdbc)
  val categoryBalanceRepository = JdbcCategoryBalanceRepository(namedJdbc)
  val categoryRepository = JdbcCategoryRepository(namedJdbc)
  val financialContainerRepository = JdbcFinancialContainerRepository(namedJdbc)
  val investmentTransactionRepository = JdbcInvestmentTransactionRepository(namedJdbc)
  val ledgerAccountRepository = JdbcLedgerAccountRepository(namedJdbc)
  val ledgerTransactionRepository = JdbcLedgerTransactionRepository(namedJdbc)
  val recurringPatternRepository = JdbcRecurringPatternRepository(namedJdbc)
  val transactionRepository = JdbcTransactionRepository(namedJdbc)

  private val budgetAllocatorService: BudgetAllocatorService = BudgetAllocatorServiceImpl(budgetPlanRepository)
  private val reservationService: ReservationService = ReservationServiceImpl()
  private val periodClosingService: PeriodClosingService = PeriodClosingServiceImpl(recurringPatternRepository)
  private val budgetLinkService: BudgetLinkService = BudgetLinkServiceImpl()
  private val ledgerPostingService: LedgerPostingService = LedgerPostingServiceImpl()
  private val investmentExecutionService: InvestmentExecutionService = InvestmentExecutionServiceImpl()

  private val domainEventPublisher: DomainEventPublisher = NoopDomainEventPublisher()
  private val reservationBalanceService = ReservationBalanceService(categoryBalanceRepository)
  private val reservationMatchingService = ReservationMatchingService(
    budgetPeriodRepository,
    budgetReservationRepository,
    recurringPatternRepository,
  )
  private val budgetAttributionService = BudgetAttributionService(budgetPlanRepository)
  private val categoryBalanceUpdaterService = CategoryBalanceUpdaterService(
    categoryRepository,
    budgetPlanRepository,
    budgetPeriodRepository,
    categoryBalanceRepository,
  )
  private val budgetLinkImpactService = BudgetLinkImpactService(
    budgetLinkService,
    budgetLinkRepository,
    categoryBalanceUpdaterService,
  )
  private val budgetPeriodTotalsService = BudgetPeriodTotalsService(budgetPeriodRepository)
  private val transferBudgetImpactService = TransferBudgetImpactService()

  val settleReservationFromTxUC: SettleReservationFromTxUC = SettleReservationFromTxService(
    reservationService,
    budgetReservationRepository,
    reservationBalanceService,
    domainEventPublisher,
  )
  val createPeriodReservationsUC: CreatePeriodReservationsUC = CreatePeriodReservationsService(
    reservationService,
    recurringPatternRepository,
    budgetReservationRepository,
    budgetPeriodRepository,
    reservationBalanceService,
    domainEventPublisher,
  )

  val createAccountUC: CreateAccountUC = CreateAccountService(accountRepository, domainEventPublisher)
  val createBudgetPeriodUC: CreateBudgetPeriodUC = CreateBudgetPeriodService(
    budgetPlanRepository,
    budgetPeriodRepository,
    createPeriodReservationsUC,
    domainEventPublisher,
  )
  val allocateBudgetUC: AllocateBudgetUC = AllocateBudgetService(
    budgetAllocatorService,
    allocationRuleRepository,
    budgetPeriodRepository,
    categoryRepository,
    categoryBalanceRepository,
    domainEventPublisher,
  )
  val postExpenseUC: PostExpenseUC = PostExpenseService(
    ledgerPostingService,
    transactionRepository,
    settleReservationFromTxUC,
    categoryBalanceUpdaterService,
    categoryRepository,
    budgetPeriodRepository,
    budgetLinkService,
    budgetLinkRepository,
    budgetAttributionService,
    reservationMatchingService,
    domainEventPublisher,
  )
  val postIncomeUC: PostIncomeUC = PostIncomeService(
    ledgerPostingService,
    transactionRepository,
    categoryBalanceUpdaterService,
    budgetPeriodTotalsService,
    budgetPeriodRepository,
    budgetLinkService,
    budgetLinkRepository,
    budgetAttributionService,
    domainEventPublisher,
  )
  val postTransferUC: PostTransferUC = PostTransferService(
    ledgerPostingService,
    transactionRepository,
    transferBudgetImpactService,
    categoryBalanceUpdaterService,
    categoryRepository,
    budgetAttributionService,
    domainEventPublisher,
  )
  val executeInvestmentUC: ExecuteInvestmentUC = ExecuteInvestmentService(
    investmentExecutionService,
    investmentTransactionRepository,
    financialContainerRepository,
    budgetLinkImpactService,
    domainEventPublisher,
  )
  val recordInvestmentReturnUC: RecordInvestmentReturnUC = RecordInvestmentReturnService(
    financialContainerRepository,
    investmentTransactionRepository,
    domainEventPublisher,
  )
  val closePeriodUC: ClosePeriodUC = ClosePeriodService(
    periodClosingService,
    budgetReservationRepository,
    budgetPeriodRepository,
    reservationBalanceService,
    domainEventPublisher,
  )

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

  val budgetPeriodTotals = budgetPeriodTotalsService
  val budgetLinkImpact = budgetLinkImpactService
  val transferBudgetImpact = transferBudgetImpactService
  val categoryBalanceUpdater = categoryBalanceUpdaterService
  val reservationBalance = reservationBalanceService
}

private class NoopDomainEventPublisher : DomainEventPublisher {
  override fun publish(event: Any) = Unit
}
