package com.gonezo.multiplatform.core;

import android.content.Context;
import com.gonezo.application.CreateAccountCommand;
import com.gonezo.application.CreateAccountUC;
import com.gonezo.application.CreateBudgetPeriodCommand;
import com.gonezo.application.CreateBudgetPeriodUC;
import com.gonezo.application.AllocateBudgetCommand;
import com.gonezo.application.AllocateBudgetUC;
import com.gonezo.application.PostExpenseCommand;
import com.gonezo.application.PostExpenseUC;
import com.gonezo.application.CreatePeriodReservationsCommand;
import com.gonezo.application.CreatePeriodReservationsUC;
import com.gonezo.application.SettleReservationFromTxCommand;
import com.gonezo.application.SettleReservationFromTxUC;
import com.gonezo.application.PostIncomeCommand;
import com.gonezo.application.PostIncomeUC;
import com.gonezo.application.PostTransferCommand;
import com.gonezo.application.PostTransferUC;
import com.gonezo.application.services.CreateAccountService;
import com.gonezo.application.services.BudgetAttributionService;
import com.gonezo.application.services.BudgetPeriodTotalsService;
import com.gonezo.application.services.CategoryBalanceUpdaterService;
import com.gonezo.application.services.AllocateBudgetService;
import com.gonezo.application.services.CreateBudgetPeriodService;
import com.gonezo.application.services.CreatePeriodReservationsService;
import com.gonezo.application.services.PostExpenseService;
import com.gonezo.application.services.PostIncomeService;
import com.gonezo.application.services.PostTransferService;
import com.gonezo.application.services.ReservationBalanceService;
import com.gonezo.application.services.ReservationMatchingService;
import com.gonezo.application.services.SettleReservationFromTxService;
import com.gonezo.application.services.TransferBudgetImpactService;
import com.gonezo.domain.budgeting.BudgetPeriod;
import com.gonezo.domain.budgeting.BudgetPlan;
import com.gonezo.domain.budgeting.BudgetPlanPeriod;
import com.gonezo.domain.budgeting.Category;
import com.gonezo.domain.budgeting.CategoryType;
import com.gonezo.domain.budgeting.AllocationRule;
import com.gonezo.domain.budgeting.BudgetReservation;
import com.gonezo.domain.budgeting.CategoryBalance;
import com.gonezo.domain.budgeting.EffectiveDatingPolicy;
import com.gonezo.domain.budgeting.NegativePolicy;
import com.gonezo.domain.budgeting.ProrationType;
import com.gonezo.domain.budgeting.RecurringCadence;
import com.gonezo.domain.budgeting.RecurringPattern;
import com.gonezo.domain.budgeting.ReservationPolicy;
import com.gonezo.domain.budgeting.services.BudgetAllocatorService;
import com.gonezo.domain.budgeting.services.BudgetAllocatorServiceImpl;
import com.gonezo.domain.budgeting.services.BudgetLinkService;
import com.gonezo.domain.budgeting.services.BudgetLinkServiceImpl;
import com.gonezo.domain.budgeting.services.ReservationService;
import com.gonezo.domain.budgeting.services.ReservationServiceImpl;
import com.gonezo.domain.cashledger.AccountType;
import com.gonezo.domain.cashledger.services.LedgerPostingService;
import com.gonezo.domain.cashledger.services.LedgerPostingServiceImpl;
import com.gonezo.domain.shared.Money;
import com.gonezo.domain.shared.Percent;
import com.gonezo.domain.shared.YearMonth;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public final class AndroidCore {
  public static final UUID DEMO_BUDGET_PLAN_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  private static final UUID DEMO_BUDGET_PERIOD_ID = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

  private static AndroidCore instance;

  private final CreateAccountUC createAccountUC;
  private final CreateBudgetPeriodUC createBudgetPeriodUC;
  private final CreatePeriodReservationsUC createPeriodReservationsUC;
  private final SettleReservationFromTxUC settleReservationFromTxUC;
  private final AllocateBudgetUC allocateBudgetUC;
  private final PostExpenseUC postExpenseUC;
  private final PostTransferUC postTransferUC;
  private final PostIncomeUC postIncomeUC;
  private final AndroidBudgetReservationRepository budgetReservationRepository;
  private final AndroidCategoryBalanceRepository categoryBalanceRepository;

  private AndroidCore(Context context) {
    CoreDatabase database = new CoreDatabase(context.getApplicationContext());
    AndroidAccountRepository accountRepository = new AndroidAccountRepository(database);
    AndroidTransactionRepository transactionRepository = new AndroidTransactionRepository(database);
    AndroidBudgetPlanRepository budgetPlanRepository = new AndroidBudgetPlanRepository(database);
    AndroidBudgetPeriodRepository budgetPeriodRepository = new AndroidBudgetPeriodRepository(database);
    AndroidCategoryRepository categoryRepository = new AndroidCategoryRepository(database);
    AndroidAllocationRuleRepository allocationRuleRepository = new AndroidAllocationRuleRepository(database);
    AndroidCategoryBalanceRepository categoryBalanceRepository = new AndroidCategoryBalanceRepository(database);
    AndroidBudgetLinkRepository budgetLinkRepository = new AndroidBudgetLinkRepository(database);
    AndroidRecurringPatternRepository recurringPatternRepository = new AndroidRecurringPatternRepository(database);
    AndroidBudgetReservationRepository budgetReservationRepository = new AndroidBudgetReservationRepository(database);
    NoopDomainEventPublisher eventPublisher = new NoopDomainEventPublisher();
    LedgerPostingService ledgerPostingService = new LedgerPostingServiceImpl();
    BudgetAllocatorService budgetAllocatorService = new BudgetAllocatorServiceImpl(budgetPlanRepository);
    ReservationService reservationService = new ReservationServiceImpl();

    CategoryBalanceUpdaterService categoryBalanceUpdaterService = new CategoryBalanceUpdaterService(
      categoryRepository,
      budgetPlanRepository,
      budgetPeriodRepository,
      categoryBalanceRepository
    );
    BudgetAttributionService budgetAttributionService = new BudgetAttributionService(budgetPlanRepository);
    BudgetPeriodTotalsService budgetPeriodTotalsService = new BudgetPeriodTotalsService(budgetPeriodRepository);
    ReservationBalanceService reservationBalanceService = new ReservationBalanceService(categoryBalanceRepository);
    ReservationMatchingService reservationMatchingService = new ReservationMatchingService(
      budgetPeriodRepository,
      budgetReservationRepository,
      recurringPatternRepository
    );
    TransferBudgetImpactService transferBudgetImpactService = new TransferBudgetImpactService();
    BudgetLinkService budgetLinkService = new BudgetLinkServiceImpl();
    this.settleReservationFromTxUC = new SettleReservationFromTxService(
      reservationService,
      budgetReservationRepository,
      reservationBalanceService,
      eventPublisher
    );

    this.createAccountUC = new CreateAccountService(accountRepository, eventPublisher);
    this.postExpenseUC = new PostExpenseService(
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
      eventPublisher
    );
    this.postTransferUC = new PostTransferService(
      ledgerPostingService,
      transactionRepository,
      transferBudgetImpactService,
      categoryBalanceUpdaterService,
      categoryRepository,
      budgetAttributionService,
      eventPublisher
    );
    this.postIncomeUC = new PostIncomeService(
      ledgerPostingService,
      transactionRepository,
      categoryBalanceUpdaterService,
      budgetPeriodTotalsService,
      budgetPeriodRepository,
      budgetLinkService,
      budgetLinkRepository,
      budgetAttributionService,
      eventPublisher
    );
    this.createPeriodReservationsUC = new CreatePeriodReservationsService(
      reservationService,
      recurringPatternRepository,
      budgetReservationRepository,
      budgetPeriodRepository,
      reservationBalanceService,
      eventPublisher
    );
    this.createBudgetPeriodUC = new CreateBudgetPeriodService(
      budgetPlanRepository,
      budgetPeriodRepository,
      createPeriodReservationsUC,
      eventPublisher
    );
    this.allocateBudgetUC = new AllocateBudgetService(
      budgetAllocatorService,
      allocationRuleRepository,
      budgetPeriodRepository,
      categoryRepository,
      categoryBalanceRepository,
      eventPublisher
    );
    this.budgetReservationRepository = budgetReservationRepository;
    this.categoryBalanceRepository = categoryBalanceRepository;

    ensureDemoBudgetData(
      budgetPlanRepository,
      budgetPeriodRepository,
      categoryRepository,
      allocationRuleRepository,
      recurringPatternRepository
    );
  }

  public static synchronized AndroidCore getInstance(Context context) {
    if (instance == null) {
      instance = new AndroidCore(context);
    }
    return instance;
  }

  public UUID createAccount(String name, String userId, String type, String currency) {
    String trimmedName = name == null ? "" : name.trim();
    if (trimmedName.isEmpty()) {
      throw new IllegalArgumentException("name is required");
    }
    UUID resolvedUserId = userId == null || userId.isBlank() ? UUID.randomUUID() : UUID.fromString(userId);
    String resolvedType = type == null || type.isBlank() ? "cash" : type;
    String resolvedCurrency = currency == null || currency.isBlank() ? "USD" : currency;

    AccountType accountType = AccountType.Companion.from(resolvedType);
    CreateAccountCommand command = new CreateAccountCommand(resolvedUserId, trimmedName, accountType, resolvedCurrency);
    return createAccountUC.execute(command);
  }

  public UUID postExpense(
    String accountId,
    String postedDate,
    String effectiveDate,
    String amount,
    String currency,
    String merchant,
    String categoryId,
    Boolean recurring,
    String reservationId
  ) {
    UUID resolvedAccountId = UUID.fromString(requireText(accountId, "accountId is required"));
    LocalDate resolvedPostedDate = LocalDate.parse(requireText(postedDate, "postedDate is required"));
    LocalDate resolvedEffectiveDate = LocalDate.parse(requireText(effectiveDate, "effectiveDate is required"));
    BigDecimal resolvedAmount = new BigDecimal(requireText(amount, "amount is required"));
    String resolvedCurrency = requireText(currency, "currency is required").trim();
    String resolvedMerchant = blankToNull(merchant);
    UUID resolvedCategoryId = parseNullableUuid(categoryId);
    UUID resolvedReservationId = parseNullableUuid(reservationId);
    boolean resolvedRecurring = recurring != null && recurring;

    PostExpenseCommand command = new PostExpenseCommand(
      resolvedAccountId,
      resolvedPostedDate,
      resolvedEffectiveDate,
      new Money(resolvedAmount, resolvedCurrency),
      resolvedMerchant,
      resolvedCategoryId,
      resolvedRecurring,
      resolvedReservationId
    );
    return postExpenseUC.execute(command);
  }

  public java.util.List<UUID> postTransfer(
    String fromAccountId,
    String toAccountId,
    String postedDate,
    String effectiveDate,
    String amount,
    String currency,
    String fromCategoryId,
    String toCategoryId
  ) {
    UUID resolvedFromAccountId = UUID.fromString(requireText(fromAccountId, "fromAccountId is required"));
    UUID resolvedToAccountId = UUID.fromString(requireText(toAccountId, "toAccountId is required"));
    LocalDate resolvedPostedDate = LocalDate.parse(requireText(postedDate, "postedDate is required"));
    LocalDate resolvedEffectiveDate = LocalDate.parse(requireText(effectiveDate, "effectiveDate is required"));
    BigDecimal resolvedAmount = new BigDecimal(requireText(amount, "amount is required"));
    String resolvedCurrency = requireText(currency, "currency is required").trim();

    PostTransferCommand command = new PostTransferCommand(
      resolvedFromAccountId,
      resolvedToAccountId,
      resolvedPostedDate,
      resolvedEffectiveDate,
      new Money(resolvedAmount, resolvedCurrency),
      parseNullableUuid(fromCategoryId),
      parseNullableUuid(toCategoryId)
    );
    return postTransferUC.execute(command);
  }

  public UUID postIncome(
    String budgetPlanId,
    String accountId,
    String postedDate,
    String effectiveDate,
    String amount,
    String currency,
    String merchant,
    String categoryId,
    Boolean recurring
  ) {
    UUID resolvedBudgetPlanId = UUID.fromString(requireText(budgetPlanId, "budgetPlanId is required"));
    UUID resolvedAccountId = UUID.fromString(requireText(accountId, "accountId is required"));
    LocalDate resolvedPostedDate = LocalDate.parse(requireText(postedDate, "postedDate is required"));
    LocalDate resolvedEffectiveDate = LocalDate.parse(requireText(effectiveDate, "effectiveDate is required"));
    BigDecimal resolvedAmount = new BigDecimal(requireText(amount, "amount is required"));
    String resolvedCurrency = requireText(currency, "currency is required").trim();
    boolean resolvedRecurring = recurring != null && recurring;

    PostIncomeCommand command = new PostIncomeCommand(
      resolvedBudgetPlanId,
      resolvedAccountId,
      resolvedPostedDate,
      resolvedEffectiveDate,
      new Money(resolvedAmount, resolvedCurrency),
      blankToNull(merchant),
      parseNullableUuid(categoryId),
      resolvedRecurring
    );
    return postIncomeUC.execute(command);
  }

  public UUID createBudgetPeriod(String planId, Integer year, Integer month, String currency) {
    UUID resolvedPlanId = UUID.fromString(requireText(planId, "planId is required"));
    int resolvedYear = requireInt(year, "year is required");
    int resolvedMonth = requireInt(month, "month is required");
    String resolvedCurrency = requireText(currency, "currency is required");

    CreateBudgetPeriodCommand command = new CreateBudgetPeriodCommand(
      resolvedPlanId,
      resolvedYear,
      resolvedMonth,
      resolvedCurrency
    );
    return createBudgetPeriodUC.execute(command);
  }

  public void allocateBudget(String periodId) {
    UUID resolvedPeriodId = UUID.fromString(requireText(periodId, "periodId is required"));
    allocateBudgetUC.execute(new AllocateBudgetCommand(resolvedPeriodId));
  }

  public void createPeriodReservations(String periodId) {
    UUID resolvedPeriodId = UUID.fromString(requireText(periodId, "periodId is required"));
    createPeriodReservationsUC.execute(new CreatePeriodReservationsCommand(resolvedPeriodId));
  }

  public void settleReservation(String reservationId, String transactionId) {
    UUID resolvedReservationId = UUID.fromString(requireText(reservationId, "reservationId is required"));
    UUID resolvedTransactionId = UUID.fromString(requireText(transactionId, "transactionId is required"));
    settleReservationFromTxUC.execute(new SettleReservationFromTxCommand(resolvedReservationId, resolvedTransactionId));
  }

  public java.util.List<CategoryBalanceView> getCategoryBalances(String periodId) {
    UUID resolvedPeriodId = UUID.fromString(requireText(periodId, "periodId is required"));
    return categoryBalanceRepository.listByPeriod(resolvedPeriodId).stream()
      .map(AndroidCore::toBalanceView)
      .toList();
  }

  public java.util.List<ReservationView> getPeriodReservations(String periodId) {
    UUID resolvedPeriodId = UUID.fromString(requireText(periodId, "periodId is required"));
    return budgetReservationRepository.listActiveByPeriod(resolvedPeriodId).stream()
      .map(AndroidCore::toReservationView)
      .toList();
  }

  private static String requireText(String value, String message) {
    if (value == null || value.trim().isEmpty()) {
      throw new IllegalArgumentException(message);
    }
    return value.trim();
  }

  private static String blankToNull(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private static UUID parseNullableUuid(String value) {
    String normalized = blankToNull(value);
    return normalized == null ? null : UUID.fromString(normalized);
  }

  private static int requireInt(Integer value, String message) {
    if (value == null) {
      throw new IllegalArgumentException(message);
    }
    return value;
  }

  private static CategoryBalanceView toBalanceView(CategoryBalance balance) {
    return new CategoryBalanceView(
      balance.getCategoryId().toString(),
      balance.getAvailable().getAmount().toPlainString(),
      balance.getAvailable().getCurrency(),
      balance.getSafeToSpend().getAmount().toPlainString()
    );
  }

  private static ReservationView toReservationView(BudgetReservation reservation) {
    return new ReservationView(
      reservation.getId().toString(),
      reservation.getBudgetPeriodId().toString(),
      reservation.getPatternId().toString(),
      reservation.getCategoryId().toString(),
      reservation.getAmount().getAmount().toPlainString(),
      reservation.getAmount().getCurrency(),
      reservation.getStatus().getValue(),
      reservation.getExpectedEffectiveDate().toString(),
      reservation.getLinkedTransactionId() == null ? null : reservation.getLinkedTransactionId().toString()
    );
  }

  public record CategoryBalanceView(
    String categoryId,
    String availableAmount,
    String currency,
    String safeToSpendAmount
  ) {}

  public record ReservationView(
    String id,
    String budgetPeriodId,
    String patternId,
    String categoryId,
    String amount,
    String currency,
    String status,
    String expectedEffectiveDate,
    String linkedTransactionId
  ) {}

  private static void ensureDemoBudgetData(
    AndroidBudgetPlanRepository budgetPlanRepository,
    AndroidBudgetPeriodRepository budgetPeriodRepository,
    AndroidCategoryRepository categoryRepository,
    AndroidAllocationRuleRepository allocationRuleRepository,
    AndroidRecurringPatternRepository recurringPatternRepository
  ) {
    try {
      budgetPlanRepository.get(DEMO_BUDGET_PLAN_ID);
    } catch (IllegalStateException ignored) {
      BudgetPlan demoPlan = new BudgetPlan(
        DEMO_BUDGET_PLAN_ID,
        UUID.fromString("00000000-0000-0000-0000-000000000001"),
        BudgetPlanPeriod.MONTHLY,
        NegativePolicy.ALLOW_WITH_MAX_DEBT,
        ReservationPolicy.MANUAL,
        EffectiveDatingPolicy.USE_EFFECTIVE_DATE
      );
      budgetPlanRepository.save(demoPlan);
    }

    try {
      budgetPeriodRepository.getByYearMonth(DEMO_BUDGET_PLAN_ID, new YearMonth(2026, 3));
    } catch (IllegalStateException ignored) {
      Money zeroUsd = new Money(BigDecimal.ZERO, "USD");
      BudgetPeriod demoPeriod = new BudgetPeriod(
        DEMO_BUDGET_PERIOD_ID,
        DEMO_BUDGET_PLAN_ID,
        new YearMonth(2026, 3),
        zeroUsd,
        zeroUsd
      );
      budgetPeriodRepository.save(demoPeriod);
    }

    UUID essentialsCategoryId = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc");
    UUID funCategoryId = UUID.fromString("dddddddd-dddd-dddd-dddd-dddddddddddd");

    try {
      categoryRepository.get(essentialsCategoryId);
    } catch (IllegalStateException ignored) {
      categoryRepository.save(
        new Category(
          essentialsCategoryId,
          DEMO_BUDGET_PLAN_ID,
          "Essentials",
          CategoryType.SPENDING,
          false,
          null
        )
      );
    }
    try {
      categoryRepository.get(funCategoryId);
    } catch (IllegalStateException ignored) {
      categoryRepository.save(
        new Category(
          funCategoryId,
          DEMO_BUDGET_PLAN_ID,
          "Fun",
          CategoryType.SPENDING,
          false,
          null
        )
      );
    }

    if (allocationRuleRepository.listByPlan(DEMO_BUDGET_PLAN_ID).isEmpty()) {
      allocationRuleRepository.save(
        new AllocationRule(
          UUID.fromString("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
          DEMO_BUDGET_PLAN_ID,
          essentialsCategoryId,
          new Percent(new BigDecimal("0.70"))
        )
      );
      allocationRuleRepository.save(
        new AllocationRule(
          UUID.fromString("ffffffff-ffff-ffff-ffff-ffffffffffff"),
          DEMO_BUDGET_PLAN_ID,
          funCategoryId,
          new Percent(new BigDecimal("0.30"))
        )
      );
    }

    if (recurringPatternRepository.listActiveByPlan(DEMO_BUDGET_PLAN_ID).isEmpty()) {
      recurringPatternRepository.save(
        new RecurringPattern(
          UUID.fromString("abababab-abab-abab-abab-abababababab"),
          DEMO_BUDGET_PLAN_ID,
          essentialsCategoryId,
          "Electric Bill",
          RecurringCadence.MONTHLY,
          new Money(new BigDecimal("50.00"), "USD"),
          new Money(new BigDecimal("5.00"), "USD"),
          "Electric",
          10,
          null,
          ProrationType.NONE,
          true
        )
      );
    }
  }
}
