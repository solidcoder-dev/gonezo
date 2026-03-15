package com.gonezo.multiplatform.core;

import android.content.Context;
import com.gonezo.application.events.DomainEventPublisher;
import com.gonezo.application.ledger.AddLedgerTransactionItemCommand;
import com.gonezo.application.ledger.AddLedgerTransactionItemUC;
import com.gonezo.application.ledger.ArchiveLedgerAccountCommand;
import com.gonezo.application.ledger.ArchiveLedgerAccountUC;
import com.gonezo.application.ledger.CreateLedgerExpenseDraftCommand;
import com.gonezo.application.ledger.CreateLedgerExpenseDraftUC;
import com.gonezo.application.ledger.GetLedgerAccountBalanceQuery;
import com.gonezo.application.ledger.GetLedgerAccountBalanceUC;
import com.gonezo.application.ledger.ListLedgerAccountsUC;
import com.gonezo.application.ledger.ListLedgerTransactionsQuery;
import com.gonezo.application.ledger.ListLedgerTransactionsUC;
import com.gonezo.application.ledger.OpenLedgerAccountCommand;
import com.gonezo.application.ledger.OpenLedgerAccountUC;
import com.gonezo.application.ledger.PostLedgerDraftTransactionCommand;
import com.gonezo.application.ledger.PostLedgerDraftTransactionUC;
import com.gonezo.application.ledger.RecordLedgerExpenseCommand;
import com.gonezo.application.ledger.RecordLedgerExpenseUC;
import com.gonezo.application.ledger.RecordLedgerIncomeCommand;
import com.gonezo.application.ledger.RecordLedgerIncomeUC;
import com.gonezo.application.ledger.RecordLedgerTransferCommand;
import com.gonezo.application.ledger.RecordLedgerTransferResult;
import com.gonezo.application.ledger.RecordLedgerTransferUC;
import com.gonezo.application.ledger.RenameLedgerAccountCommand;
import com.gonezo.application.ledger.RenameLedgerAccountUC;
import com.gonezo.application.ledger.VoidLedgerTransactionCommand;
import com.gonezo.application.ledger.VoidLedgerTransactionUC;
import com.gonezo.application.services.ledger.AddLedgerTransactionItemService;
import com.gonezo.application.services.ledger.ArchiveLedgerAccountService;
import com.gonezo.application.services.ledger.CreateLedgerExpenseDraftService;
import com.gonezo.application.services.ledger.GetLedgerAccountBalanceService;
import com.gonezo.application.services.ledger.ListLedgerAccountsService;
import com.gonezo.application.services.ledger.ListLedgerTransactionsService;
import com.gonezo.application.services.ledger.OpenLedgerAccountService;
import com.gonezo.application.services.ledger.PostLedgerDraftTransactionService;
import com.gonezo.application.services.ledger.RecordLedgerExpenseService;
import com.gonezo.application.services.ledger.RecordLedgerIncomeService;
import com.gonezo.application.services.ledger.RecordLedgerTransferService;
import com.gonezo.application.services.ledger.RenameLedgerAccountService;
import com.gonezo.application.services.ledger.VoidLedgerTransactionService;
import com.gonezo.domain.ledger.Account;
import com.gonezo.domain.ledger.AccountId;
import com.gonezo.domain.ledger.CategoryId;
import com.gonezo.domain.ledger.CurrencyCode;
import com.gonezo.domain.ledger.DateRange;
import com.gonezo.domain.ledger.Transaction;
import com.gonezo.domain.ledger.TransactionId;
import com.gonezo.domain.ledger.TransactionItem;
import com.gonezo.domain.ledger.TransactionStatus;
import com.gonezo.domain.ledger.services.BalanceCalculator;
import com.gonezo.domain.shared.Money;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

public final class AndroidLedgerCore {
  private static AndroidLedgerCore instance;

  private final OpenLedgerAccountUC openAccountUC;
  private final RenameLedgerAccountUC renameAccountUC;
  private final ArchiveLedgerAccountUC archiveAccountUC;
  private final ListLedgerAccountsUC listAccountsUC;
  private final RecordLedgerIncomeUC recordIncomeUC;
  private final RecordLedgerExpenseUC recordExpenseUC;
  private final RecordLedgerTransferUC recordTransferUC;
  private final CreateLedgerExpenseDraftUC createExpenseDraftUC;
  private final AddLedgerTransactionItemUC addTransactionItemUC;
  private final PostLedgerDraftTransactionUC postDraftTransactionUC;
  private final VoidLedgerTransactionUC voidTransactionUC;
  private final ListLedgerTransactionsUC listTransactionsUC;
  private final GetLedgerAccountBalanceUC getAccountBalanceUC;
  private final AndroidLedgerAccountRepository accountRepository;

  private AndroidLedgerCore(Context context) {
    CoreDatabase database = new CoreDatabase(context.getApplicationContext());
    AndroidLedgerAccountRepository accountRepository = new AndroidLedgerAccountRepository(database);
    AndroidLedgerTransactionRepository transactionRepository = new AndroidLedgerTransactionRepository(database);
    DomainEventPublisher eventPublisher = new NoopDomainEventPublisher();

    this.openAccountUC = new OpenLedgerAccountService(accountRepository, transactionRepository, eventPublisher);
    this.renameAccountUC = new RenameLedgerAccountService(accountRepository);
    this.archiveAccountUC = new ArchiveLedgerAccountService(accountRepository, eventPublisher);
    this.listAccountsUC = new ListLedgerAccountsService(accountRepository);
    this.recordIncomeUC = new RecordLedgerIncomeService(accountRepository, transactionRepository, eventPublisher);
    this.recordExpenseUC = new RecordLedgerExpenseService(accountRepository, transactionRepository, eventPublisher);
    this.recordTransferUC = new RecordLedgerTransferService(accountRepository, transactionRepository, eventPublisher);
    this.createExpenseDraftUC = new CreateLedgerExpenseDraftService(accountRepository, transactionRepository);
    this.addTransactionItemUC = new AddLedgerTransactionItemService(transactionRepository, eventPublisher);
    this.postDraftTransactionUC = new PostLedgerDraftTransactionService(transactionRepository, eventPublisher);
    this.voidTransactionUC = new VoidLedgerTransactionService(transactionRepository, eventPublisher);
    this.listTransactionsUC = new ListLedgerTransactionsService(transactionRepository);
    this.getAccountBalanceUC = new GetLedgerAccountBalanceService(accountRepository, transactionRepository, new BalanceCalculator());
    this.accountRepository = accountRepository;
  }

  public static synchronized AndroidLedgerCore getInstance(Context context) {
    if (instance == null) {
      instance = new AndroidLedgerCore(context);
    }
    return instance;
  }

  public UUID openAccount(String name, String type, String currency, String createdAt, String openingBalanceAmount) {
    String trimmedName = requireText(name, "name is required");
    String resolvedType = blankToNull(type) == null ? "cash" : type.trim();
    String resolvedCurrency = blankToNull(currency) == null ? "USD" : currency.trim().toUpperCase();
    Instant resolvedCreatedAt = blankToNull(createdAt) == null ? Instant.now() : parseInstantOrDate(createdAt, "createdAt");
    BigDecimal resolvedOpeningBalance = blankToNull(openingBalanceAmount) == null
      ? null
      : new BigDecimal(openingBalanceAmount.trim());

    OpenLedgerAccountCommand command = new OpenLedgerAccountCommand(
      trimmedName,
      com.gonezo.domain.ledger.AccountType.Companion.from(resolvedType),
      CurrencyCode.Companion.from(resolvedCurrency),
      resolvedCreatedAt,
      resolvedOpeningBalance
    );
    return openAccountUC.execute(command).getValue();
  }

  public List<String> listSupportedCurrencies() {
    return CurrencyCode.Companion.supported().stream()
      .map(CurrencyCode::getValue)
      .toList();
  }

  public void renameAccount(String accountId, String name) {
    renameAccountUC.execute(
      new RenameLedgerAccountCommand(
        new AccountId(UUID.fromString(requireText(accountId, "accountId is required"))),
        requireText(name, "name is required")
      )
    );
  }

  public void archiveAccount(String accountId, String archivedAt) {
    archiveAccountUC.execute(
      new ArchiveLedgerAccountCommand(
        new AccountId(UUID.fromString(requireText(accountId, "accountId is required"))),
        blankToNull(archivedAt) == null ? Instant.now() : parseInstantOrDate(archivedAt, "archivedAt")
      )
    );
  }

  public List<LedgerAccountView> listAccounts() {
    return listAccountsUC.execute().stream()
      .map(AndroidLedgerCore::toAccountView)
      .toList();
  }

  public LedgerAccountSummaryView getAccountSummary(String accountId) {
    AccountId resolvedAccountId = new AccountId(UUID.fromString(requireText(accountId, "accountId is required")));
    Account account = accountRepository.findById(resolvedAccountId);
    if (account == null) {
      throw new IllegalStateException("Account not found: " + accountId);
    }
    Money balance = getAccountBalanceUC.execute(new GetLedgerAccountBalanceQuery(resolvedAccountId));
    return new LedgerAccountSummaryView(
      account.getId().toString(),
      account.getName(),
      account.getType().getValue(),
      account.getCurrency().toString(),
      balance.getAmount().toPlainString()
    );
  }

  public UUID recordExpense(String accountId, String occurredAt, String amount, String currency, String description, String merchant, String categoryId) {
    RecordLedgerExpenseCommand command = new RecordLedgerExpenseCommand(
      new AccountId(UUID.fromString(requireText(accountId, "accountId is required"))),
      new Money(new BigDecimal(requireText(amount, "amount is required")), requireText(currency, "currency is required").toUpperCase()),
      parseInstantOrDate(occurredAt, "occurredAt"),
      blankToNull(description),
      blankToNull(merchant),
      parseNullableCategoryId(categoryId)
    );
    return recordExpenseUC.execute(command).getValue();
  }

  public UUID recordIncome(String accountId, String occurredAt, String amount, String currency, String description, String merchant, String categoryId) {
    RecordLedgerIncomeCommand command = new RecordLedgerIncomeCommand(
      new AccountId(UUID.fromString(requireText(accountId, "accountId is required"))),
      new Money(new BigDecimal(requireText(amount, "amount is required")), requireText(currency, "currency is required").toUpperCase()),
      parseInstantOrDate(occurredAt, "occurredAt"),
      blankToNull(description),
      blankToNull(merchant),
      parseNullableCategoryId(categoryId)
    );
    return recordIncomeUC.execute(command).getValue();
  }

  public LedgerTransferResultView recordTransfer(String fromAccountId, String toAccountId, String occurredAt, String amount, String currency, String description) {
    RecordLedgerTransferCommand command = new RecordLedgerTransferCommand(
      new AccountId(UUID.fromString(requireText(fromAccountId, "fromAccountId is required"))),
      new AccountId(UUID.fromString(requireText(toAccountId, "toAccountId is required"))),
      new Money(new BigDecimal(requireText(amount, "amount is required")), requireText(currency, "currency is required").toUpperCase()),
      parseInstantOrDate(occurredAt, "occurredAt"),
      blankToNull(description)
    );
    RecordLedgerTransferResult result = recordTransferUC.execute(command);
    return new LedgerTransferResultView(result.getTransferOutId().toString(), result.getTransferInId().toString());
  }

  public UUID createExpenseDraft(String accountId, String occurredAt, String amount, String currency, String description, String merchant, String categoryId) {
    CreateLedgerExpenseDraftCommand command = new CreateLedgerExpenseDraftCommand(
      new AccountId(UUID.fromString(requireText(accountId, "accountId is required"))),
      new Money(new BigDecimal(requireText(amount, "amount is required")), requireText(currency, "currency is required").toUpperCase()),
      parseInstantOrDate(occurredAt, "occurredAt"),
      blankToNull(description),
      blankToNull(merchant),
      parseNullableCategoryId(categoryId)
    );
    return createExpenseDraftUC.execute(command).getValue();
  }

  public void addTransactionItem(String transactionId, String name, String amount, String currency, String categoryId, String note) {
    addTransactionItemUC.execute(
      new AddLedgerTransactionItemCommand(
        new TransactionId(UUID.fromString(requireText(transactionId, "transactionId is required"))),
        requireText(name, "name is required"),
        new Money(new BigDecimal(requireText(amount, "amount is required")), requireText(currency, "currency is required").toUpperCase()),
        parseNullableCategoryId(categoryId),
        blankToNull(note)
      )
    );
  }

  public void postDraftTransaction(String transactionId) {
    postDraftTransactionUC.execute(
      new PostLedgerDraftTransactionCommand(new TransactionId(UUID.fromString(requireText(transactionId, "transactionId is required"))))
    );
  }

  public void voidTransaction(String transactionId) {
    voidTransactionUC.execute(
      new VoidLedgerTransactionCommand(new TransactionId(UUID.fromString(requireText(transactionId, "transactionId is required"))))
    );
  }

  public List<LedgerTransactionView> listTransactions(
    String accountId,
    Integer limit,
    String fromDate,
    String toDate,
    String categoryId,
    String merchant,
    Boolean includeVoided
  ) {
    DateRange range = null;
    if (blankToNull(fromDate) != null && blankToNull(toDate) != null) {
      range = new DateRange(Instant.parse(fromDate), Instant.parse(toDate));
    }
    ListLedgerTransactionsQuery query = new ListLedgerTransactionsQuery(
      new AccountId(UUID.fromString(requireText(accountId, "accountId is required"))),
      limit,
      range,
      parseNullableCategoryId(categoryId),
      blankToNull(merchant)
    );
    boolean resolvedIncludeVoided = includeVoided != null && includeVoided;
    return listTransactionsUC.execute(query).stream()
      .filter((tx) -> resolvedIncludeVoided || tx.getStatus() != TransactionStatus.VOIDED)
      .map(AndroidLedgerCore::toTransactionView)
      .toList();
  }

  private static LedgerAccountView toAccountView(Account account) {
    return new LedgerAccountView(
      account.getId().toString(),
      account.getName(),
      account.getType().getValue(),
      account.getCurrency().toString(),
      account.getStatus().getValue()
    );
  }

  private static LedgerTransactionView toTransactionView(Transaction tx) {
    List<LedgerTransactionItemView> items = tx.getItems().stream()
      .map((item) -> new LedgerTransactionItemView(
        item.getId().toString(),
        item.getName(),
        item.getAmount().getAmount().toPlainString(),
        item.getAmount().getCurrency(),
        item.getCategoryId() == null ? null : item.getCategoryId().toString(),
        item.getNote()
      ))
      .toList();
    return new LedgerTransactionView(
      tx.getId().toString(),
      tx.getAccountId().toString(),
      tx.getType().getValue(),
      tx.getStatus().getValue(),
      tx.getAmount().getAmount().toPlainString(),
      tx.getAmount().getCurrency(),
      tx.getOccurredAt().toString(),
      tx.getDescription(),
      tx.getMerchant(),
      tx.getCategoryId() == null ? null : tx.getCategoryId().toString(),
      items
    );
  }

  private static CategoryId parseNullableCategoryId(String value) {
    String normalized = blankToNull(value);
    return normalized == null ? null : new CategoryId(UUID.fromString(normalized));
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

  private static Instant parseInstantOrDate(String value, String fieldName) {
    String normalized = requireText(value, fieldName + " is required");
    try {
      return Instant.parse(normalized);
    } catch (DateTimeParseException ignored) {
      try {
        return LocalDate.parse(normalized).atStartOfDay().toInstant(ZoneOffset.UTC);
      } catch (DateTimeParseException ex) {
        throw new IllegalArgumentException(fieldName + " must be ISO-8601 instant or yyyy-MM-dd");
      }
    }
  }

  public record LedgerAccountView(
    String id,
    String name,
    String type,
    String currency,
    String status
  ) {}

  public record LedgerAccountSummaryView(
    String accountId,
    String name,
    String type,
    String currency,
    String balanceAmount
  ) {}

  public record LedgerTransactionItemView(
    String id,
    String name,
    String amount,
    String currency,
    String categoryId,
    String note
  ) {}

  public record LedgerTransactionView(
    String id,
    String accountId,
    String type,
    String status,
    String amount,
    String currency,
    String occurredAt,
    String description,
    String merchant,
    String categoryId,
    List<LedgerTransactionItemView> items
  ) {}

  public record LedgerTransferResultView(
    String transferOutId,
    String transferInId
  ) {}
}
