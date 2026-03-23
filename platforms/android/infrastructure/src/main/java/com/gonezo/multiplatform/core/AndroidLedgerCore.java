package com.gonezo.multiplatform.core;

import android.content.Context;
import com.gonezo.application.events.DomainEventPublisher;
import com.gonezo.ledger.application.AddLedgerTransactionItemCommand;
import com.gonezo.ledger.application.AddLedgerTransactionItemUC;
import com.gonezo.ledger.application.ArchiveLedgerAccountCommand;
import com.gonezo.ledger.application.ArchiveLedgerAccountUC;
import com.gonezo.ledger.application.CreateLedgerExpenseDraftCommand;
import com.gonezo.ledger.application.CreateLedgerExpenseDraftUC;
import com.gonezo.ledger.application.GetLedgerAccountBalanceQuery;
import com.gonezo.ledger.application.GetLedgerAccountBalanceUC;
import com.gonezo.ledger.application.ListLedgerAccountsUC;
import com.gonezo.ledger.application.ListLedgerTransactionsQuery;
import com.gonezo.ledger.application.ListLedgerTransactionsUC;
import com.gonezo.ledger.application.OpenLedgerAccountCommand;
import com.gonezo.ledger.application.OpenLedgerAccountUC;
import com.gonezo.ledger.application.PostLedgerDraftTransactionCommand;
import com.gonezo.ledger.application.PostLedgerDraftTransactionUC;
import com.gonezo.ledger.application.RecordLedgerExpenseCommand;
import com.gonezo.ledger.application.RecordLedgerExpenseUC;
import com.gonezo.ledger.application.RecordLedgerIncomeCommand;
import com.gonezo.ledger.application.RecordLedgerIncomeUC;
import com.gonezo.ledger.application.RecordLedgerTransferCommand;
import com.gonezo.ledger.application.RecordLedgerTransferResult;
import com.gonezo.ledger.application.RecordLedgerTransferUC;
import com.gonezo.ledger.application.RenameLedgerAccountCommand;
import com.gonezo.ledger.application.RenameLedgerAccountUC;
import com.gonezo.ledger.application.VoidLedgerTransactionCommand;
import com.gonezo.ledger.application.VoidLedgerTransactionUC;
import com.gonezo.ledger.application.AddLedgerTransactionItemService;
import com.gonezo.ledger.application.ArchiveLedgerAccountService;
import com.gonezo.ledger.application.CreateLedgerExpenseDraftService;
import com.gonezo.ledger.application.GetLedgerAccountBalanceService;
import com.gonezo.ledger.application.ListLedgerAccountsService;
import com.gonezo.ledger.application.ListLedgerTransactionsService;
import com.gonezo.ledger.application.OpenLedgerAccountService;
import com.gonezo.ledger.application.PostLedgerDraftTransactionService;
import com.gonezo.ledger.application.RecordLedgerExpenseService;
import com.gonezo.ledger.application.RecordLedgerIncomeService;
import com.gonezo.ledger.application.RecordLedgerTransferService;
import com.gonezo.ledger.application.RenameLedgerAccountService;
import com.gonezo.ledger.application.VoidLedgerTransactionService;
import com.gonezo.ledger.domain.Account;
import com.gonezo.ledger.domain.AccountId;
import com.gonezo.ledger.domain.CurrencyCode;
import com.gonezo.ledger.domain.DateRange;
import com.gonezo.ledger.domain.Transaction;
import com.gonezo.ledger.domain.TransactionId;
import com.gonezo.ledger.domain.TransactionItem;
import com.gonezo.ledger.domain.TransactionStatus;
import com.gonezo.ledger.domain.services.BalanceCalculator;
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
  private final AndroidMobillsImportFingerprintRepository mobillsImportFingerprintRepository;

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
    this.mobillsImportFingerprintRepository = new AndroidMobillsImportFingerprintRepository(database);
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
      com.gonezo.ledger.domain.AccountType.Companion.from(resolvedType),
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
      blankToNull(merchant)
    );
    return recordExpenseUC.execute(command).getValue();
  }

  public UUID recordIncome(String accountId, String occurredAt, String amount, String currency, String description, String merchant, String categoryId) {
    RecordLedgerIncomeCommand command = new RecordLedgerIncomeCommand(
      new AccountId(UUID.fromString(requireText(accountId, "accountId is required"))),
      new Money(new BigDecimal(requireText(amount, "amount is required")), requireText(currency, "currency is required").toUpperCase()),
      parseInstantOrDate(occurredAt, "occurredAt"),
      blankToNull(description),
      blankToNull(merchant)
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
      blankToNull(merchant)
    );
    return createExpenseDraftUC.execute(command).getValue();
  }

  public void addTransactionItem(String transactionId, String name, String amount, String currency, String categoryId, String note) {
    addTransactionItemUC.execute(
      new AddLedgerTransactionItemCommand(
        new TransactionId(UUID.fromString(requireText(transactionId, "transactionId is required"))),
        requireText(name, "name is required"),
        new Money(new BigDecimal(requireText(amount, "amount is required")), requireText(currency, "currency is required").toUpperCase()),
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
      blankToNull(merchant)
    );
    boolean resolvedIncludeVoided = includeVoided != null && includeVoided;
    return listTransactionsUC.execute(query).stream()
      .filter((tx) -> resolvedIncludeVoided || tx.getStatus() != TransactionStatus.VOIDED)
      .map(AndroidLedgerCore::toTransactionView)
      .toList();
  }

  public String findMobillsImportTransactionId(String fingerprint) {
    return mobillsImportFingerprintRepository.findTransactionIdByFingerprint(
      requireText(fingerprint, "fingerprint is required")
    );
  }

  public void recordMobillsImportFingerprint(String fingerprint, String transactionId) {
    mobillsImportFingerprintRepository.recordImported(
      requireText(fingerprint, "fingerprint is required"),
      requireText(transactionId, "transactionId is required"),
      Instant.now()
    );
  }

  public void touchMobillsImportFingerprint(String fingerprint) {
    mobillsImportFingerprintRepository.touchDuplicate(
      requireText(fingerprint, "fingerprint is required"),
      Instant.now()
    );
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
        null,
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
      null,
      items
    );
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
