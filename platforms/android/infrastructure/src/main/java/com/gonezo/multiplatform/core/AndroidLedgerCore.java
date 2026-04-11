package com.gonezo.multiplatform.core;

import android.content.Context;
import com.gonezo.application.events.DomainEventPublisher;
import com.gonezo.ledger.application.AddLedgerTransactionItemCommand;
import com.gonezo.ledger.application.AddLedgerTransactionItemUC;
import com.gonezo.ledger.application.ArchiveLedgerAccountCommand;
import com.gonezo.ledger.application.ArchiveLedgerAccountUC;
import com.gonezo.ledger.application.CreateLedgerExpenseDraftCommand;
import com.gonezo.ledger.application.CreateLedgerExpenseDraftUC;
import com.gonezo.ledger.application.DeleteLedgerAccountCommand;
import com.gonezo.ledger.application.DeleteLedgerAccountUC;
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
import com.gonezo.ledger.application.RecordLedgerTransferFxCommand;
import com.gonezo.ledger.application.RecordLedgerTransferResult;
import com.gonezo.ledger.application.RecordLedgerTransferFxUC;
import com.gonezo.ledger.application.RecordLedgerTransferUC;
import com.gonezo.ledger.application.RenameLedgerAccountCommand;
import com.gonezo.ledger.application.RenameLedgerAccountUC;
import com.gonezo.ledger.application.VoidLedgerTransactionCommand;
import com.gonezo.ledger.application.VoidLedgerTransactionUC;
import com.gonezo.ledger.application.AddLedgerTransactionItemService;
import com.gonezo.ledger.application.ArchiveLedgerAccountService;
import com.gonezo.ledger.application.CreateLedgerExpenseDraftService;
import com.gonezo.ledger.application.DeleteLedgerAccountService;
import com.gonezo.ledger.application.GetLedgerAccountBalanceService;
import com.gonezo.ledger.application.ListLedgerAccountsService;
import com.gonezo.ledger.application.ListLedgerTransactionsService;
import com.gonezo.ledger.application.OpenLedgerAccountService;
import com.gonezo.ledger.application.PostLedgerDraftTransactionService;
import com.gonezo.ledger.application.RecordLedgerExpenseService;
import com.gonezo.ledger.application.RecordLedgerIncomeService;
import com.gonezo.ledger.application.RecordLedgerTransferService;
import com.gonezo.ledger.application.RecordLedgerTransferFxService;
import com.gonezo.ledger.application.RenameLedgerAccountService;
import com.gonezo.ledger.application.VoidLedgerTransactionService;
import com.gonezo.ledger.domain.Account;
import com.gonezo.ledger.domain.AccountId;
import com.gonezo.ledger.domain.CurrencyCode;
import com.gonezo.ledger.domain.Transaction;
import com.gonezo.ledger.domain.TransactionId;
import com.gonezo.ledger.domain.TransactionItem;
import com.gonezo.ledger.domain.services.BalanceCalculator;
import com.gonezo.domain.shared.Money;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

public final class AndroidLedgerCore {
  private static AndroidLedgerCore instance;

  private final OpenLedgerAccountUC openAccountUC;
  private final RenameLedgerAccountUC renameAccountUC;
  private final ArchiveLedgerAccountUC archiveAccountUC;
  private final DeleteLedgerAccountUC deleteAccountUC;
  private final ListLedgerAccountsUC listAccountsUC;
  private final RecordLedgerIncomeUC recordIncomeUC;
  private final RecordLedgerExpenseUC recordExpenseUC;
  private final RecordLedgerTransferUC recordTransferUC;
  private final RecordLedgerTransferFxUC recordTransferFxUC;
  private final CreateLedgerExpenseDraftUC createExpenseDraftUC;
  private final AddLedgerTransactionItemUC addTransactionItemUC;
  private final PostLedgerDraftTransactionUC postDraftTransactionUC;
  private final VoidLedgerTransactionUC voidTransactionUC;
  private final ListLedgerTransactionsUC listTransactionsUC;
  private final GetLedgerAccountBalanceUC getAccountBalanceUC;
  private final AndroidLedgerAccountRepository accountRepository;
  private final AndroidMobillsImportFingerprintRepository mobillsImportFingerprintRepository;
  private final AndroidTransactionVoiceAnalysisRepository transactionVoiceAnalysisRepository;

  private AndroidLedgerCore(Context context) {
    CoreDatabase database = new CoreDatabase(context.getApplicationContext());
    AndroidLedgerAccountRepository accountRepository = new AndroidLedgerAccountRepository(database);
    AndroidLedgerTransactionRepository transactionRepository = new AndroidLedgerTransactionRepository(database);
    DomainEventPublisher eventPublisher = new NoopDomainEventPublisher();

    this.openAccountUC = new OpenLedgerAccountService(accountRepository, transactionRepository, eventPublisher);
    this.renameAccountUC = new RenameLedgerAccountService(accountRepository);
    this.archiveAccountUC = new ArchiveLedgerAccountService(accountRepository, eventPublisher);
    this.deleteAccountUC = new DeleteLedgerAccountService(accountRepository);
    this.listAccountsUC = new ListLedgerAccountsService(accountRepository);
    this.recordIncomeUC = new RecordLedgerIncomeService(accountRepository, transactionRepository, eventPublisher);
    this.recordExpenseUC = new RecordLedgerExpenseService(accountRepository, transactionRepository, eventPublisher);
    this.recordTransferUC = new RecordLedgerTransferService(accountRepository, transactionRepository, eventPublisher);
    this.recordTransferFxUC = new RecordLedgerTransferFxService(accountRepository, transactionRepository, eventPublisher);
    this.createExpenseDraftUC = new CreateLedgerExpenseDraftService(accountRepository, transactionRepository);
    this.addTransactionItemUC = new AddLedgerTransactionItemService(transactionRepository, eventPublisher);
    this.postDraftTransactionUC = new PostLedgerDraftTransactionService(transactionRepository, eventPublisher);
    this.voidTransactionUC = new VoidLedgerTransactionService(transactionRepository, eventPublisher);
    this.listTransactionsUC = new ListLedgerTransactionsService(transactionRepository);
    this.getAccountBalanceUC = new GetLedgerAccountBalanceService(accountRepository, transactionRepository, new BalanceCalculator());
    this.accountRepository = accountRepository;
    this.mobillsImportFingerprintRepository = new AndroidMobillsImportFingerprintRepository(database);
    this.transactionVoiceAnalysisRepository = new AndroidTransactionVoiceAnalysisRepository(database);
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

  public void deleteAccount(String accountId) {
    deleteAccountUC.execute(
      new DeleteLedgerAccountCommand(
        new AccountId(UUID.fromString(requireText(accountId, "accountId is required")))
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

  public LedgerTransferResultView recordTransferFx(
    String fromAccountId,
    String toAccountId,
    String occurredAt,
    String sourceAmount,
    String sourceCurrency,
    String destinationAmount,
    String destinationCurrency,
    String exchangeRate,
    String description
  ) {
    RecordLedgerTransferFxCommand command = new RecordLedgerTransferFxCommand(
      new AccountId(UUID.fromString(requireText(fromAccountId, "fromAccountId is required"))),
      new AccountId(UUID.fromString(requireText(toAccountId, "toAccountId is required"))),
      new Money(
        new BigDecimal(requireText(sourceAmount, "sourceAmount is required")),
        requireText(sourceCurrency, "sourceCurrency is required").toUpperCase()
      ),
      new Money(
        new BigDecimal(requireText(destinationAmount, "destinationAmount is required")),
        requireText(destinationCurrency, "destinationCurrency is required").toUpperCase()
      ),
      parseInstantOrDate(occurredAt, "occurredAt"),
      blankToNull(description),
      blankToNull(exchangeRate) == null ? null : new BigDecimal(exchangeRate)
    );
    RecordLedgerTransferResult result = recordTransferFxUC.execute(command);
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
    List<String> statuses = includeVoided != null && includeVoided
      ? null
      : List.of("draft", "posted");

    LedgerTransactionFilterInput filters = new LedgerTransactionFilterInput(
      null,
      blankToNull(merchant),
      blankToNull(categoryId),
      blankToNull(fromDate),
      blankToNull(toDate),
      statuses,
      null
    );
    LedgerPageRequestInput pagination = new LedgerPageRequestInput(0, limit != null && limit > 0 ? limit : 20);
    List<LedgerTransactionSortInput> sort = List.of(new LedgerTransactionSortInput("occurredAt", "desc"));
    return listTransactions(accountId, filters, pagination, sort).content();
  }

  public LedgerTransactionPageView listTransactions(
    String accountId,
    LedgerTransactionFilterInput filters,
    LedgerPageRequestInput pagination,
    List<LedgerTransactionSortInput> sort
  ) {
    LedgerTransactionFilterInput resolvedFilters = filters == null
      ? new LedgerTransactionFilterInput(null, null, null, null, null, null, null)
      : filters;

    int requestedPage = pagination != null && pagination.page() != null && pagination.page() >= 0 ? pagination.page() : 0;
    int requestedSize = pagination != null && pagination.size() != null && pagination.size() > 0 ? pagination.size() : 20;
    int pageSize = Math.min(requestedSize, 100);

    Instant fromInstant = blankToNull(resolvedFilters.fromDate()) == null
      ? null
      : parseInstantOrDate(resolvedFilters.fromDate(), "fromDate");
    Instant toInstant = blankToNull(resolvedFilters.toDate()) == null
      ? null
      : parseInstantOrDate(resolvedFilters.toDate(), "toDate");

    Set<String> statusesFilterBuffer = null;
    if (resolvedFilters.statuses() != null && !resolvedFilters.statuses().isEmpty()) {
      statusesFilterBuffer = new HashSet<>();
      for (String status : resolvedFilters.statuses()) {
        String normalized = blankToNull(status);
        if (normalized != null) {
          statusesFilterBuffer.add(normalized.toLowerCase(Locale.ROOT));
        }
      }
    }
    final Set<String> statusesFilter = statusesFilterBuffer;

    Set<String> typesFilterBuffer = null;
    if (resolvedFilters.types() != null && !resolvedFilters.types().isEmpty()) {
      typesFilterBuffer = new HashSet<>();
      for (String type : resolvedFilters.types()) {
        String normalized = blankToNull(type);
        if (normalized != null) {
          typesFilterBuffer.add(normalized.toLowerCase(Locale.ROOT));
        }
      }
    }
    final Set<String> typesFilter = typesFilterBuffer;

    String merchantFilterValue = blankToNull(resolvedFilters.merchant());
    if (merchantFilterValue != null) {
      merchantFilterValue = merchantFilterValue.toLowerCase(Locale.ROOT);
    }
    final String merchantFilter = merchantFilterValue;

    String textFilterValue = blankToNull(resolvedFilters.text());
    if (textFilterValue != null) {
      textFilterValue = textFilterValue.toLowerCase(Locale.ROOT);
    }
    final String textFilter = textFilterValue;

    ListLedgerTransactionsQuery query = new ListLedgerTransactionsQuery(
      new AccountId(UUID.fromString(requireText(accountId, "accountId is required"))),
      null,
      null,
      null
    );

    List<Transaction> filtered = listTransactionsUC.execute(query).stream()
      .filter((tx) -> fromInstant == null || !tx.getOccurredAt().isBefore(fromInstant))
      .filter((tx) -> toInstant == null || !tx.getOccurredAt().isAfter(toInstant))
      .filter((tx) -> statusesFilter == null || statusesFilter.contains(tx.getStatus().getValue().toLowerCase(Locale.ROOT)))
      .filter((tx) -> typesFilter == null || typesFilter.contains(tx.getType().getValue().toLowerCase(Locale.ROOT)))
      .filter((tx) -> {
        if (merchantFilter == null) {
          return true;
        }
        String merchantValue = tx.getMerchant() == null ? "" : tx.getMerchant().toLowerCase(Locale.ROOT);
        return merchantValue.contains(merchantFilter);
      })
      .filter((tx) -> {
        if (textFilter == null) {
          return true;
        }
        String merchantValue = tx.getMerchant() == null ? "" : tx.getMerchant().toLowerCase(Locale.ROOT);
        String descriptionValue = tx.getDescription() == null ? "" : tx.getDescription().toLowerCase(Locale.ROOT);
        return merchantValue.contains(textFilter) || descriptionValue.contains(textFilter);
      })
      .toList();

    List<LedgerTransactionSortInput> resolvedSort = sort == null || sort.isEmpty()
      ? List.of(new LedgerTransactionSortInput("occurredAt", "desc"))
      : sort;

    List<Transaction> sorted = new java.util.ArrayList<>(filtered);
    Comparator<Transaction> comparator = (left, right) -> {
      for (LedgerTransactionSortInput criterion : resolvedSort) {
        String field = blankToNull(criterion.field()) == null ? "occurredAt" : criterion.field();
        String direction = blankToNull(criterion.direction()) == null ? "desc" : criterion.direction();

        int comparison;
        if ("amount".equalsIgnoreCase(field)) {
          comparison = left.getAmount().getAmount().compareTo(right.getAmount().getAmount());
        } else {
          comparison = left.getOccurredAt().compareTo(right.getOccurredAt());
        }

        if (comparison != 0) {
          return "asc".equalsIgnoreCase(direction) ? comparison : -comparison;
        }
      }
      return right.getId().toString().compareTo(left.getId().toString());
    };
    sorted.sort(comparator);

    int totalElements = sorted.size();
    int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / pageSize);
    int resolvedPage = totalPages == 0 ? 0 : Math.min(requestedPage, totalPages - 1);
    int start = resolvedPage * pageSize;
    int end = Math.min(start + pageSize, totalElements);

    List<LedgerTransactionView> content = sorted.subList(start, end).stream()
      .map(AndroidLedgerCore::toTransactionView)
      .toList();

    return new LedgerTransactionPageView(
      content,
      resolvedPage,
      pageSize,
      totalElements,
      totalPages,
      totalPages > 0 && resolvedPage + 1 < totalPages,
      resolvedPage > 0
    );
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

  public void recordTransactionVoiceCapture(
    String analysisId,
    String recordingId,
    String recordingPath,
    String accountId,
    String expectedType,
    String initialDraftJson,
    String createdAt
  ) {
    transactionVoiceAnalysisRepository.recordCapture(
      requireText(analysisId, "analysisId is required"),
      requireText(recordingId, "recordingId is required"),
      requireText(recordingPath, "recordingPath is required"),
      requireText(accountId, "accountId is required"),
      requireText(expectedType, "expectedType is required"),
      requireText(initialDraftJson, "initialDraftJson is required"),
      requireText(createdAt, "createdAt is required")
    );
  }

  public boolean hasTransactionVoiceCapture(String analysisId) {
    return transactionVoiceAnalysisRepository.exists(requireText(analysisId, "analysisId is required"));
  }

  public void finalizeTransactionVoiceCapture(
    String analysisId,
    String outcome,
    String transactionIdsJson,
    String finalDraftJson,
    String errorMessage,
    String finalizedAt
  ) {
    transactionVoiceAnalysisRepository.finalizeCapture(
      requireText(analysisId, "analysisId is required"),
      requireText(outcome, "outcome is required"),
      blankToNull(transactionIdsJson),
      blankToNull(finalDraftJson),
      blankToNull(errorMessage),
      requireText(finalizedAt, "finalizedAt is required")
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

  public record LedgerTransactionFilterInput(
    String text,
    String merchant,
    String categoryId,
    String fromDate,
    String toDate,
    List<String> statuses,
    List<String> types
  ) {}

  public record LedgerPageRequestInput(
    Integer page,
    Integer size
  ) {}

  public record LedgerTransactionSortInput(
    String field,
    String direction
  ) {}

  public record LedgerTransactionPageView(
    List<LedgerTransactionView> content,
    int page,
    int size,
    int totalElements,
    int totalPages,
    boolean hasNext,
    boolean hasPrevious
  ) {}

  public record LedgerTransferResultView(
    String transferOutId,
    String transferInId
  ) {}
}
