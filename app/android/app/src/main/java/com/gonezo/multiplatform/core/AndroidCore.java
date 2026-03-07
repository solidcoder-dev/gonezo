package com.gonezo.multiplatform.core;

import android.content.Context;
import com.gonezo.application.CreateAccountCommand;
import com.gonezo.application.CreateAccountUC;
import com.gonezo.application.PostExpenseCommand;
import com.gonezo.application.PostExpenseUC;
import com.gonezo.application.PostTransferCommand;
import com.gonezo.application.PostTransferUC;
import com.gonezo.application.services.CreateAccountService;
import com.gonezo.application.services.BudgetAttributionService;
import com.gonezo.application.services.CategoryBalanceUpdaterService;
import com.gonezo.application.services.PostExpenseService;
import com.gonezo.application.services.PostTransferService;
import com.gonezo.application.services.ReservationMatchingService;
import com.gonezo.application.services.TransferBudgetImpactService;
import com.gonezo.domain.budgeting.services.BudgetLinkService;
import com.gonezo.domain.budgeting.services.BudgetLinkServiceImpl;
import com.gonezo.domain.cashledger.AccountType;
import com.gonezo.domain.cashledger.services.LedgerPostingService;
import com.gonezo.domain.cashledger.services.LedgerPostingServiceImpl;
import com.gonezo.domain.shared.Money;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public final class AndroidCore {
  private static AndroidCore instance;

  private final CreateAccountUC createAccountUC;
  private final PostExpenseUC postExpenseUC;
  private final PostTransferUC postTransferUC;

  private AndroidCore(Context context) {
    CoreDatabase database = new CoreDatabase(context.getApplicationContext());
    AndroidAccountRepository accountRepository = new AndroidAccountRepository(database);
    AndroidTransactionRepository transactionRepository = new AndroidTransactionRepository(database);
    NoopDomainEventPublisher eventPublisher = new NoopDomainEventPublisher();
    LedgerPostingService ledgerPostingService = new LedgerPostingServiceImpl();

    var categoryRepository = AndroidBudgetingStubs.categoryRepository();
    var budgetPlanRepository = AndroidBudgetingStubs.budgetPlanRepository();
    var budgetPeriodRepository = AndroidBudgetingStubs.budgetPeriodRepository();
    var categoryBalanceRepository = AndroidBudgetingStubs.categoryBalanceRepository();
    var budgetLinkRepository = AndroidBudgetingStubs.budgetLinkRepository();
    var budgetReservationRepository = AndroidBudgetingStubs.budgetReservationRepository();
    var recurringPatternRepository = AndroidBudgetingStubs.recurringPatternRepository();

    CategoryBalanceUpdaterService categoryBalanceUpdaterService = new CategoryBalanceUpdaterService(
      categoryRepository,
      budgetPlanRepository,
      budgetPeriodRepository,
      categoryBalanceRepository
    );
    BudgetAttributionService budgetAttributionService = new BudgetAttributionService(budgetPlanRepository);
    ReservationMatchingService reservationMatchingService = new ReservationMatchingService(
      budgetPeriodRepository,
      budgetReservationRepository,
      recurringPatternRepository
    );
    TransferBudgetImpactService transferBudgetImpactService = new TransferBudgetImpactService();
    BudgetLinkService budgetLinkService = new BudgetLinkServiceImpl();

    this.createAccountUC = new CreateAccountService(accountRepository, eventPublisher);
    this.postExpenseUC = new PostExpenseService(
      ledgerPostingService,
      transactionRepository,
      AndroidBudgetingStubs.settleReservationFromTxUC(),
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
}
