package com.gonezo.multiplatform.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidExpectedCore;
import com.gonezo.multiplatform.core.AndroidRecurringCore;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "CorePlugin")
public class CorePlugin extends Plugin {
  @PluginMethod
  public void ledgerOpenAccount(PluginCall call) {
    String name = call.getString("name");
    String type = call.getString("type");
    String currency = call.getString("currency");
    String createdAt = call.getString("createdAt");
    String openingBalanceAmount = call.getString("openingBalanceAmount");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      String id = core.openAccount(name, type, currency, createdAt, openingBalanceAmount).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerListSupportedCurrencies(PluginCall call) {
    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      java.util.List<String> currencies = core.listSupportedCurrencies();
      org.json.JSONArray items = new org.json.JSONArray();
      for (String currency : currencies) {
        items.put(currency);
      }
      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerRenameAccount(PluginCall call) {
    String accountId = call.getString("accountId");
    String name = call.getString("name");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      core.renameAccount(accountId, name);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerArchiveAccount(PluginCall call) {
    String accountId = call.getString("accountId");
    String archivedAt = call.getString("archivedAt");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      core.archiveAccount(accountId, archivedAt);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerDeleteAccount(PluginCall call) {
    String accountId = call.getString("accountId");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      java.util.List<AndroidLedgerCore.LedgerTransactionView> existingTransactions = core.listTransactions(
        accountId,
        null,
        null,
        null,
        null,
        null,
        true
      );
      core.deleteAccount(accountId);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerListAccounts(PluginCall call) {
    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      java.util.List<AndroidLedgerCore.LedgerAccountView> accounts = core.listAccounts();
      org.json.JSONArray items = new org.json.JSONArray();
      for (AndroidLedgerCore.LedgerAccountView account : accounts) {
        JSObject item = new JSObject();
        item.put("id", account.id());
        item.put("name", account.name());
        item.put("type", account.type());
        item.put("currency", account.currency());
        item.put("status", account.status());
        items.put(item);
      }
      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerGetAccountSummary(PluginCall call) {
    String accountId = call.getString("accountId");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      AndroidLedgerCore.LedgerAccountSummaryView summary = core.getAccountSummary(accountId);
      JSObject result = new JSObject();
      result.put("accountId", summary.accountId());
      result.put("name", summary.name());
      result.put("type", summary.type());
      result.put("currency", summary.currency());
      result.put("balanceAmount", summary.balanceAmount());
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerRecordExpense(PluginCall call) {
    String accountId = call.getString("accountId");
    String occurredAt = call.getString("occurredAt");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String description = call.getString("description");
    String merchant = call.getString("merchant");
    String categoryId = call.getString("categoryId");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      String id = core.recordExpense(accountId, occurredAt, amount, currency, description, merchant, categoryId).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerRecordIncome(PluginCall call) {
    String accountId = call.getString("accountId");
    String occurredAt = call.getString("occurredAt");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String description = call.getString("description");
    String merchant = call.getString("merchant");
    String categoryId = call.getString("categoryId");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      String id = core.recordIncome(accountId, occurredAt, amount, currency, description, merchant, categoryId).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerRecordTransfer(PluginCall call) {
    String fromAccountId = call.getString("fromAccountId");
    String toAccountId = call.getString("toAccountId");
    String occurredAt = call.getString("occurredAt");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String description = call.getString("description");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      AndroidLedgerCore.LedgerTransferResultView result = core.recordTransfer(
        fromAccountId,
        toAccountId,
        occurredAt,
        amount,
        currency,
        description
      );
      JSObject response = new JSObject();
      response.put("transferOutId", result.transferOutId());
      response.put("transferInId", result.transferInId());
      call.resolve(response);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerRecordTransferFx(PluginCall call) {
    String fromAccountId = call.getString("fromAccountId");
    String toAccountId = call.getString("toAccountId");
    String occurredAt = call.getString("occurredAt");
    String sourceAmount = call.getString("sourceAmount");
    String sourceCurrency = call.getString("sourceCurrency");
    String destinationAmount = call.getString("destinationAmount");
    String destinationCurrency = call.getString("destinationCurrency");
    String exchangeRate = call.getString("exchangeRate");
    String description = call.getString("description");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      AndroidLedgerCore.LedgerTransferResultView result = core.recordTransferFx(
        fromAccountId,
        toAccountId,
        occurredAt,
        sourceAmount,
        sourceCurrency,
        destinationAmount,
        destinationCurrency,
        exchangeRate,
        description
      );
      JSObject response = new JSObject();
      response.put("transferOutId", result.transferOutId());
      response.put("transferInId", result.transferInId());
      call.resolve(response);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerCreateExpenseDraft(PluginCall call) {
    String accountId = call.getString("accountId");
    String occurredAt = call.getString("occurredAt");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String description = call.getString("description");
    String merchant = call.getString("merchant");
    String categoryId = call.getString("categoryId");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      String id = core.createExpenseDraft(accountId, occurredAt, amount, currency, description, merchant, categoryId).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerAddTransactionItem(PluginCall call) {
    String transactionId = call.getString("transactionId");
    String name = call.getString("name");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String categoryId = call.getString("categoryId");
    String note = call.getString("note");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      core.addTransactionItem(transactionId, name, amount, currency, categoryId, note);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerPostDraftTransaction(PluginCall call) {
    String transactionId = call.getString("transactionId");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      core.postDraftTransaction(transactionId);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerVoidTransaction(PluginCall call) {
    String transactionId = call.getString("transactionId");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      core.voidTransaction(transactionId);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void ledgerListTransactions(PluginCall call) {
    String accountId = call.getString("accountId");
    JSObject filters = call.getObject("filters");
    JSObject pagination = call.getObject("pagination");
    JSONArray sort = call.getArray("sort");

    try {
      String text = filters == null ? null : nullIfBlank(filters.getString("text", null));
      String merchant = filters == null ? null : nullIfBlank(filters.getString("merchant", null));
      String categoryId = filters == null ? null : nullIfBlank(filters.getString("categoryId", null));
      List<String> categoryIds = filters == null ? null : toStringList(filters.optJSONArray("categoryIds"));
      if ((categoryIds == null || categoryIds.isEmpty()) && categoryId != null) {
        categoryIds = List.of(categoryId);
      }
      List<String> tagIds = filters == null ? null : toStringList(filters.optJSONArray("tagIds"));
      BigDecimal amountMin = parseDecimalOrNull(filters == null ? null : filters.getString("amountMin", null));
      BigDecimal amountMax = parseDecimalOrNull(filters == null ? null : filters.getString("amountMax", null));
      if (amountMin != null && amountMax != null && amountMin.compareTo(amountMax) > 0) {
        BigDecimal swap = amountMin;
        amountMin = amountMax;
        amountMax = swap;
      }
      String fromDate = filters == null ? null : nullIfBlank(filters.getString("fromDate", null));
      String toDate = filters == null ? null : nullIfBlank(filters.getString("toDate", null));
      List<String> statuses = filters == null ? null : toStringList(filters.optJSONArray("statuses"));
      List<String> types = filters == null ? null : toStringList(filters.optJSONArray("types"));

      int requestedPage = pagination == null ? 0 : Math.max(pagination.optInt("page", 0), 0);
      int requestedSize = pagination == null ? 20 : pagination.optInt("size", 20);
      int pageSize = requestedSize > 0 ? Math.min(requestedSize, 100) : 20;
      List<AndroidLedgerCore.LedgerTransactionSortInput> resolvedSort = toSortInput(sort);

      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      AndroidTaxonomyCore taxonomyCore = AndroidTaxonomyCore.getInstance(getContext());
      List<AndroidLedgerCore.LedgerTransactionView> allTransactions = listAllTransactions(
        core,
        accountId,
        new AndroidLedgerCore.LedgerTransactionFilterInput(
          text,
          merchant,
          null,
          fromDate,
          toDate,
          statuses,
          types
        ),
        resolvedSort
      );

      java.util.Set<String> categoryFilter = categoryIds == null || categoryIds.isEmpty()
        ? null
        : new java.util.HashSet<>(categoryIds);
      java.util.Set<String> tagFilter = tagIds == null || tagIds.isEmpty()
        ? null
        : new java.util.HashSet<>(tagIds);
      List<String> transactionIds = allTransactions.stream().map(AndroidLedgerCore.LedgerTransactionView::id).toList();
      Map<String, AndroidTaxonomyCore.TransactionTaxonomyView> taxonomyByTransactionId =
        taxonomyCore.listTransactionTaxonomy(transactionIds);

      List<AndroidLedgerCore.LedgerTransactionView> filteredTransactions = new ArrayList<>();
      for (AndroidLedgerCore.LedgerTransactionView tx : allTransactions) {
        AndroidTaxonomyCore.TransactionTaxonomyView taxonomy = taxonomyByTransactionId.get(tx.id());
        String resolvedCategoryId = taxonomy == null ? null : taxonomy.categoryId();
        if (resolvedCategoryId == null || resolvedCategoryId.trim().isEmpty()) {
          resolvedCategoryId = tx.categoryId();
        }

        if (categoryFilter != null && (resolvedCategoryId == null || !categoryFilter.contains(resolvedCategoryId))) {
          continue;
        }

        if (tagFilter != null) {
          List<String> assignedTagIds = taxonomy == null ? null : taxonomy.tagIds();
          if (assignedTagIds == null || assignedTagIds.isEmpty()) {
            continue;
          }
          boolean matchesAnyTag = false;
          for (String assignedTagId : assignedTagIds) {
            if (tagFilter.contains(assignedTagId)) {
              matchesAnyTag = true;
              break;
            }
          }
          if (!matchesAnyTag) {
            continue;
          }
        }

        if (amountMin != null || amountMax != null) {
          BigDecimal amount;
          try {
            amount = new BigDecimal(tx.amount());
          } catch (NumberFormatException ex) {
            continue;
          }

          if (amountMin != null && amount.compareTo(amountMin) < 0) {
            continue;
          }
          if (amountMax != null && amount.compareTo(amountMax) > 0) {
            continue;
          }
        }

        filteredTransactions.add(tx);
      }

      int totalElements = filteredTransactions.size();
      int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / pageSize);
      int resolvedPage = totalPages == 0 ? 0 : Math.min(requestedPage, totalPages - 1);
      int start = resolvedPage * pageSize;
      int end = Math.min(start + pageSize, totalElements);
      List<AndroidLedgerCore.LedgerTransactionView> pageTransactions = filteredTransactions.subList(start, end);

      org.json.JSONArray items = new org.json.JSONArray();
      for (AndroidLedgerCore.LedgerTransactionView tx : pageTransactions) {
        JSObject item = new JSObject();
        item.put("id", tx.id());
        item.put("accountId", tx.accountId());
        item.put("type", tx.type());
        item.put("status", tx.status());
        item.put("amount", tx.amount());
        item.put("currency", tx.currency());
        item.put("occurredAt", tx.occurredAt());
        item.put("description", tx.description());
        item.put("merchant", tx.merchant());
        AndroidTaxonomyCore.TransactionTaxonomyView taxonomy = taxonomyByTransactionId.get(tx.id());
        String categoryIdValue = taxonomy == null ? null : taxonomy.categoryId();
        if (categoryIdValue == null || categoryIdValue.trim().isEmpty()) {
          categoryIdValue = tx.categoryId();
        }
        item.put("categoryId", categoryIdValue);

        org.json.JSONArray txItems = new org.json.JSONArray();
        for (AndroidLedgerCore.LedgerTransactionItemView txItem : tx.items()) {
          JSObject txItemJson = new JSObject();
          txItemJson.put("id", txItem.id());
          txItemJson.put("name", txItem.name());
          txItemJson.put("amount", txItem.amount());
          txItemJson.put("currency", txItem.currency());
          txItemJson.put("categoryId", txItem.categoryId());
          txItemJson.put("note", txItem.note());
          txItems.put(txItemJson);
        }

        item.put("items", txItems);
        items.put(item);
      }

      JSObject result = new JSObject();
      result.put("content", items);
      result.put("items", items);
      result.put("page", resolvedPage);
      result.put("size", pageSize);
      result.put("totalElements", totalElements);
      result.put("totalPages", totalPages);
      result.put("hasNext", totalPages > 0 && resolvedPage + 1 < totalPages);
      result.put("hasPrevious", resolvedPage > 0);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void taxonomyListCategories(PluginCall call) {
    String appliesTo = call.getString("appliesTo");
    Boolean includeArchived = call.getBoolean("includeArchived");

    try {
      AndroidTaxonomyCore core = AndroidTaxonomyCore.getInstance(getContext());
      java.util.List<AndroidTaxonomyCore.TaxonomyCategoryView> categories = core.listCategories(appliesTo, includeArchived);
      org.json.JSONArray items = new org.json.JSONArray();
      for (AndroidTaxonomyCore.TaxonomyCategoryView category : categories) {
        JSObject item = new JSObject();
        item.put("id", category.id());
        item.put("name", category.name());
        item.put("appliesTo", category.appliesTo());
        item.put("status", category.status());
        items.put(item);
      }

      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void taxonomyCreateCategory(PluginCall call) {
    String name = call.getString("name");
    String appliesTo = call.getString("appliesTo");
    try {
      AndroidTaxonomyCore core = AndroidTaxonomyCore.getInstance(getContext());
      String id = core.createCategory(name, appliesTo).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void taxonomyListTags(PluginCall call) {
    Boolean includeArchived = call.getBoolean("includeArchived");

    try {
      AndroidTaxonomyCore core = AndroidTaxonomyCore.getInstance(getContext());
      org.json.JSONArray items = new org.json.JSONArray();
      for (AndroidTaxonomyCore.TaxonomyTagView tag : core.listTags(includeArchived)) {
        JSObject item = new JSObject();
        item.put("id", tag.id());
        item.put("name", tag.name());
        item.put("status", tag.status());
        items.put(item);
      }

      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void mobillsImport(PluginCall call) {
    String fileBase64 = call.getString("fileBase64");
    if (fileBase64 == null || fileBase64.trim().isEmpty()) {
      call.reject("fileBase64 is required");
      return;
    }

    JSObject policy = call.getObject("policy");
    if (policy == null) {
      policy = new JSObject();
    }
    Boolean createMissingAccountsValue = policy.getBool("createMissingAccounts");
    Boolean createMissingCategoriesValue = policy.getBool("createMissingCategories");
    Boolean createMissingTagsValue = policy.getBool("createMissingTags");
    boolean createMissingAccounts = createMissingAccountsValue != null && createMissingAccountsValue;
    boolean createMissingCategories = createMissingCategoriesValue == null || createMissingCategoriesValue;
    boolean createMissingTags = createMissingTagsValue == null || createMissingTagsValue;
    String duplicatePolicy = normalizeDuplicatePolicy(policy.getString("duplicatePolicy", "skip"));

    try {
      byte[] bytes = Base64.getDecoder().decode(fileBase64);
      String decodedText = decodeMobillsText(bytes);
      JSObject result = importMobillsText(
        decodedText,
        createMissingAccounts,
        createMissingCategories,
        createMissingTags,
        duplicatePolicy
      );
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void orchestrationCategorizeTransaction(PluginCall call) {
    String transactionId = call.getString("transactionId");
    String transactionType = call.getString("transactionType");
    String categoryId = call.getString("categoryId");
    try {
      AndroidTaxonomyCore core = AndroidTaxonomyCore.getInstance(getContext());
      AndroidTaxonomyCore.TaxonomyCategorizationResultView categorization = core.categorizeTransaction(
        transactionId,
        transactionType,
        categoryId
      );

      JSObject result = new JSObject();
      result.put("status", categorization.status());
      if (categorization.categoryId() != null) {
        result.put("categoryId", categorization.categoryId());
      }
      if (categorization.errorCode() != null) {
        result.put("errorCode", categorization.errorCode());
      }
      if (categorization.errorMessage() != null) {
        result.put("errorMessage", categorization.errorMessage());
      }
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void orchestrationApplyTransactionTags(PluginCall call) {
    String transactionId = call.getString("transactionId");
    JSONArray tagNames = call.getArray("tagNames");
    if (transactionId == null || transactionId.trim().isEmpty()) {
      call.reject("transactionId is required");
      return;
    }

    try {
      JSObject result = applyTagsToTransaction(transactionId, tagNames);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void orchestrationListTransactionTaxonomy(PluginCall call) {
    JSONArray transactionIds = call.getArray("transactionIds");
    try {
      JSONArray items = new JSONArray();
      AndroidTaxonomyCore core = AndroidTaxonomyCore.getInstance(getContext());
      List<String> requestedTransactionIds = new ArrayList<>();
      if (transactionIds != null) {
        for (int index = 0; index < transactionIds.length(); index++) {
          String transactionId = transactionIds.optString(index, "").trim();
          if (!transactionId.isEmpty()) {
            requestedTransactionIds.add(transactionId);
          }
        }

        Map<String, AndroidTaxonomyCore.TransactionTaxonomyView> taxonomy =
          core.listTransactionTaxonomy(requestedTransactionIds);
        for (int index = 0; index < transactionIds.length(); index++) {
          String transactionId = transactionIds.optString(index, "").trim();
          if (transactionId.isEmpty()) {
            continue;
          }
          JSObject item = new JSObject();
          item.put("transactionId", transactionId);

          AndroidTaxonomyCore.TransactionTaxonomyView view = taxonomy.get(transactionId);
          String categoryId = view == null ? null : view.categoryId();
          if (categoryId != null && !categoryId.trim().isEmpty()) {
            item.put("categoryId", categoryId);
          }
          item.put("categorizationStatus", view == null ? "none" : view.categorizationStatus());

          JSONArray tagIds = new JSONArray();
          List<String> tags = view == null ? List.of() : view.tagIds();
          for (String tagId : tags) {
            tagIds.put(tagId);
          }
          item.put("tagIds", tagIds);
          item.put("taggingStatus", view == null ? "none" : view.taggingStatus());
          items.put(item);
        }
      }
      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void recurrenceCreateRecurringMovement(PluginCall call) {
    String type = call.getString("type", "expense");
    String sourceAccountId = call.getString("sourceAccountId");
    String targetAccountId = call.getString("targetAccountId");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String description = call.getString("description");
    String merchant = call.getString("merchant");
    String destinationAmount = call.getString("destinationAmount");
    String destinationCurrency = call.getString("destinationCurrency");
    String exchangeRate = call.getString("exchangeRate");
    String startAt = call.getString("startAt", Instant.now().toString());
    String zoneId = call.getString("zoneId", "UTC");
    String categoryId = call.getString("categoryId");
    JSObject rule = call.getObject("rule");
    JSObject recurrenceEnd = call.getObject("recurrenceEnd");

    try {
      AndroidRecurringCore recurrenceCore = AndroidRecurringCore.getInstance(getContext());
      UUID id = recurrenceCore.createRecurringMovement(
        new AndroidRecurringCore.CreateRecurringMovementInput(
          type == null ? "expense" : type.trim().toLowerCase(Locale.ROOT),
          sourceAccountId,
          nullIfBlank(targetAccountId),
          amount,
          currency,
          nullIfBlank(destinationAmount),
          nullIfBlank(destinationCurrency),
          nullIfBlank(exchangeRate),
          nullIfBlank(description),
          nullIfBlank(merchant),
          nullIfBlank(categoryId),
          toRecurringRuleInput(rule),
          toRecurrenceEndInput(recurrenceEnd),
          startAt,
          zoneId == null ? "UTC" : zoneId.trim()
        )
      );

      JSObject result = new JSObject();
      result.put("id", id.toString());
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void recurrenceDeactivateRecurringMovement(PluginCall call) {
    String recurringMovementId = call.getString("recurringMovementId");
    String deactivatedAt = call.getString("deactivatedAt", Instant.now().toString());
    try {
      AndroidRecurringCore recurrenceCore = AndroidRecurringCore.getInstance(getContext());
      recurrenceCore.deactivateRecurringMovement(recurringMovementId, deactivatedAt);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void recurrenceListRecurringMovements(PluginCall call) {
    String sourceAccountId = call.getString("sourceAccountId");
    try {
      String accountId = nullIfBlank(sourceAccountId);
      if (accountId == null) {
        throw new IllegalArgumentException("sourceAccountId is required");
      }
      AndroidRecurringCore recurrenceCore = AndroidRecurringCore.getInstance(getContext());
      List<AndroidRecurringCore.RecurringMovementView> items = recurrenceCore.listRecurringMovements(accountId);
      JSONArray array = new JSONArray();
      for (AndroidRecurringCore.RecurringMovementView item : items) {
        array.put(toRecurringMovementJson(item));
      }
      JSObject result = new JSObject();
      result.put("items", array);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void expectedCreateMovement(PluginCall call) {
    String accountId = call.getString("accountId");
    String type = call.getString("type");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String expectedAt = call.getString("expectedAt");
    String description = call.getString("description");
    String merchant = call.getString("merchant");
    String categoryId = call.getString("categoryId");

    try {
      AndroidExpectedCore expectedCore = AndroidExpectedCore.getInstance(getContext());
      UUID id = expectedCore.createMovement(
        accountId,
        type,
        amount,
        currency,
        expectedAt,
        description,
        merchant,
        categoryId
      );
      JSObject result = new JSObject();
      result.put("id", id.toString());
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void expectedListMovements(PluginCall call) {
    String accountId = call.getString("accountId");
    Boolean includeClosedValue = call.getBoolean("includeClosed");
    boolean includeClosed = includeClosedValue != null && includeClosedValue;

    try {
      AndroidExpectedCore expectedCore = AndroidExpectedCore.getInstance(getContext());
      JSONArray items = new JSONArray();
      for (AndroidExpectedCore.ExpectedMovementView movement : expectedCore.listMovements(accountId, includeClosed)) {
        items.put(toExpectedMovementJson(movement));
      }
      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void expectedResolveMovement(PluginCall call) {
    String expectedMovementId = call.getString("expectedMovementId");
    String transactionId = call.getString("transactionId");
    String resolvedAt = call.getString("resolvedAt");

    try {
      AndroidExpectedCore expectedCore = AndroidExpectedCore.getInstance(getContext());
      expectedCore.resolveMovement(expectedMovementId, transactionId, resolvedAt);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void expectedDismissMovement(PluginCall call) {
    String expectedMovementId = call.getString("expectedMovementId");
    String dismissedAt = call.getString("dismissedAt");

    try {
      AndroidExpectedCore expectedCore = AndroidExpectedCore.getInstance(getContext());
      expectedCore.dismissMovement(expectedMovementId, dismissedAt);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  private AndroidRecurringCore.RecurrenceRuleInput toRecurringRuleInput(JSObject rawRule) {
    JSObject rule = rawRule == null ? new JSObject() : rawRule;
    JSONArray rawWeeklyDays = rule.optJSONArray("weeklyDays");
    List<Integer> weeklyDays = new ArrayList<>();
    if (rawWeeklyDays != null) {
      for (int index = 0; index < rawWeeklyDays.length(); index++) {
        if (rawWeeklyDays.isNull(index)) {
          continue;
        }
        int value = rawWeeklyDays.optInt(index, Integer.MIN_VALUE);
        if (value != Integer.MIN_VALUE) {
          weeklyDays.add(value);
        }
      }
    }
    String frequency = nullIfBlank(rule.optString("frequency", null));
    String monthlyPattern = nullIfBlank(rule.optString("monthlyPattern", null));
    Integer interval = nullableInteger(rule, "interval");
    Integer dayOfMonth = nullableInteger(rule, "dayOfMonth");
    Integer monthlyWeekOrdinal = nullableInteger(rule, "monthlyWeekOrdinal");
    Integer monthlyWeekday = nullableInteger(rule, "monthlyWeekday");
    return new AndroidRecurringCore.RecurrenceRuleInput(
      frequency == null ? "daily" : frequency,
      interval == null ? 1 : interval,
      weeklyDays,
      monthlyPattern == null ? "day_of_month" : monthlyPattern,
      dayOfMonth,
      monthlyWeekOrdinal,
      monthlyWeekday
    );
  }

  private AndroidRecurringCore.RecurrenceEndInput toRecurrenceEndInput(JSObject rawRecurrenceEnd) {
    JSObject recurrenceEnd = rawRecurrenceEnd == null ? new JSObject() : rawRecurrenceEnd;
    String kind = nullIfBlank(recurrenceEnd.optString("kind", null));
    String onDate = nullIfBlank(recurrenceEnd.optString("onDate", null));
    Integer afterOccurrences = nullableInteger(recurrenceEnd, "afterOccurrences");
    return new AndroidRecurringCore.RecurrenceEndInput(
      kind == null ? "never" : kind,
      onDate,
      afterOccurrences
    );
  }

  private JSObject toRecurringMovementJson(AndroidRecurringCore.RecurringMovementView movement) {
    JSObject result = new JSObject();
    result.put("id", movement.getId());
    result.put("type", movement.getType());
    result.put("sourceAccountId", movement.getSourceAccountId());
    result.put("targetAccountId", movement.getTargetAccountId());
    result.put("amount", movement.getAmount());
    result.put("currency", movement.getCurrency());
    result.put("destinationAmount", movement.getDestinationAmount());
    result.put("destinationCurrency", movement.getDestinationCurrency());
    result.put("exchangeRate", movement.getExchangeRate());
    result.put("description", movement.getDescription());
    result.put("merchant", movement.getMerchant());
    result.put("categoryId", movement.getCategoryId());
    result.put("status", movement.getStatus());
    result.put("startAt", movement.getStartAt());
    result.put("nextDueAt", movement.getNextDueAt());
    result.put("zoneId", movement.getZoneId());
    result.put("generatedOccurrences", movement.getGeneratedOccurrences());
    result.put("rule", toRecurrenceRuleJson(movement.getRule()));
    result.put("recurrenceEnd", toRecurrenceEndJson(movement.getRecurrenceEnd()));
    return result;
  }

  private JSObject toExpectedMovementJson(AndroidExpectedCore.ExpectedMovementView movement) {
    JSObject result = new JSObject();
    result.put("id", movement.getId());
    result.put("accountId", movement.getAccountId());
    result.put("type", movement.getType());
    result.put("amount", movement.getAmount());
    result.put("currency", movement.getCurrency());
    result.put("expectedAt", movement.getExpectedAt());
    result.put("description", movement.getDescription());
    result.put("merchant", movement.getMerchant());
    result.put("categoryId", movement.getCategoryId());
    result.put("originOccurrenceId", JSONObject.NULL);
    result.put("status", movement.getStatus());
    result.put("resolvedTransactionId", movement.getResolvedTransactionId());
    result.put("createdAt", movement.getCreatedAt());
    result.put("updatedAt", movement.getUpdatedAt());
    result.put("resolvedAt", movement.getResolvedAt());
    result.put("dismissedAt", movement.getDismissedAt());
    return result;
  }

  private JSObject toRecurrenceRuleJson(AndroidRecurringCore.RecurrenceRuleInput rule) {
    JSObject result = new JSObject();
    result.put("frequency", rule.getFrequency());
    result.put("interval", rule.getInterval());
    JSONArray weeklyDays = new JSONArray();
    for (Integer day : rule.getWeeklyDays()) {
      weeklyDays.put(day);
    }
    result.put("weeklyDays", weeklyDays);
    result.put("monthlyPattern", rule.getMonthlyPattern());
    result.put("dayOfMonth", rule.getDayOfMonth());
    result.put("monthlyWeekOrdinal", rule.getMonthlyWeekOrdinal());
    result.put("monthlyWeekday", rule.getMonthlyWeekday());
    return result;
  }

  private JSObject toRecurrenceEndJson(AndroidRecurringCore.RecurrenceEndInput recurrenceEnd) {
    JSObject result = new JSObject();
    result.put("kind", recurrenceEnd.getKind());
    result.put("onDate", recurrenceEnd.getOnDate());
    result.put("afterOccurrences", recurrenceEnd.getAfterOccurrences());
    return result;
  }

  private Integer nullableInteger(JSONObject input, String key) {
    if (input == null || !input.has(key) || input.isNull(key)) {
      return null;
    }
    return input.optInt(key);
  }

  private List<String> toStringList(JSONArray values) {
    if (values == null || values.length() == 0) {
      return null;
    }
    List<String> result = new ArrayList<>();
    for (int index = 0; index < values.length(); index++) {
      String value = values.optString(index, "").trim();
      if (!value.isEmpty()) {
        result.add(value);
      }
    }
    return result.isEmpty() ? null : result;
  }

  private BigDecimal parseDecimalOrNull(String value) {
    String normalized = nullIfBlank(value);
    if (normalized == null) {
      return null;
    }
    try {
      return new BigDecimal(normalized);
    } catch (NumberFormatException ex) {
      return null;
    }
  }

  private List<AndroidLedgerCore.LedgerTransactionView> listAllTransactions(
    AndroidLedgerCore core,
    String accountId,
    AndroidLedgerCore.LedgerTransactionFilterInput filters,
    List<AndroidLedgerCore.LedgerTransactionSortInput> sort
  ) {
    List<AndroidLedgerCore.LedgerTransactionView> all = new ArrayList<>();
    int page = 0;
    while (true) {
      AndroidLedgerCore.LedgerTransactionPageView chunk = core.listTransactions(
        accountId,
        filters,
        new AndroidLedgerCore.LedgerPageRequestInput(page, 100),
        sort
      );
      all.addAll(chunk.content());
      if (!chunk.hasNext()) {
        break;
      }
      page += 1;
    }
    return all;
  }

  private List<AndroidLedgerCore.LedgerTransactionSortInput> toSortInput(JSONArray values) {
    List<AndroidLedgerCore.LedgerTransactionSortInput> result = new ArrayList<>();
    if (values != null) {
      for (int index = 0; index < values.length(); index++) {
        JSONObject item = values.optJSONObject(index);
        if (item == null) {
          continue;
        }
        String field = nullIfBlank(item.optString("field", null));
        String direction = nullIfBlank(item.optString("direction", null));
        if (field == null) {
          continue;
        }
        result.add(new AndroidLedgerCore.LedgerTransactionSortInput(field, direction == null ? "desc" : direction));
      }
    }
    if (result.isEmpty()) {
      result.add(new AndroidLedgerCore.LedgerTransactionSortInput("occurredAt", "desc"));
    }
    return result;
  }

  private JSObject importMobillsText(
    String content,
    boolean createMissingAccounts,
    boolean createMissingCategories,
    boolean createMissingTags,
    String duplicatePolicy
  ) throws JSONException {
    String[] lines = content.split("\\r?\\n");
    int headerLineIndex = -1;
    for (int index = 0; index < lines.length; index++) {
      if (!lines[index].trim().isEmpty()) {
        headerLineIndex = index;
        break;
      }
    }

    if (headerLineIndex < 0) {
      return buildImportResponse(new JSONArray());
    }

    char delimiter = MobillsDelimitedParser.detectDelimiter(lines[headerLineIndex]);
    List<String> headerCells = MobillsDelimitedParser.splitDelimited(lines[headerLineIndex], delimiter);
    int dateIndex = findHeaderIndex(headerCells, "date", "fecha");
    int accountIndex = findHeaderIndex(headerCells, "account", "cuenta");
    int valueIndex = findHeaderIndex(headerCells, "value", "amount", "valor", "importe");
    if (dateIndex < 0 || accountIndex < 0 || valueIndex < 0) {
      throw new IllegalArgumentException("Missing required columns: date/account/value");
    }
    int currencyIndex = findHeaderIndex(headerCells, "currency", "moneda");
    int descriptionIndex = findHeaderIndex(headerCells, "description", "descripcion", "concept", "note");
    int merchantIndex = findHeaderIndex(headerCells, "merchant", "counterparty", "store", "payee", "comercio");
    int categoryIndex = findHeaderIndex(headerCells, "category", "categoria");
    int tagsIndex = findHeaderIndex(headerCells, "tags", "etiquetas", "tag");

    AndroidLedgerCore ledgerCore = AndroidLedgerCore.getInstance(getContext());
    AndroidTaxonomyCore taxonomyCore = AndroidTaxonomyCore.getInstance(getContext());
    List<AndroidLedgerCore.LedgerAccountView> cachedAccounts = new ArrayList<>(ledgerCore.listAccounts());

    JSONArray rowResults = new JSONArray();
    for (int index = headerLineIndex + 1; index < lines.length; index++) {
      String line = lines[index];
      if (line.trim().isEmpty()) {
        continue;
      }
      int sourceLine = index + 1;

      List<String> cells = MobillsDelimitedParser.splitDelimited(line, delimiter);
      String accountName = cell(cells, accountIndex).trim();
      String occurredAt = parseMobillsDate(cell(cells, dateIndex));
      BigDecimal value = parseMobillsValue(cell(cells, valueIndex));
      if (accountName.isEmpty()) {
        rowResults.put(failedImportRow(sourceLine, "MISSING_ACCOUNT", "Account is required at line " + sourceLine));
        continue;
      }
      if (occurredAt == null) {
        rowResults.put(failedImportRow(sourceLine, "INVALID_DATE", "Cannot parse date at line " + sourceLine));
        continue;
      }
      if (value == null) {
        rowResults.put(failedImportRow(sourceLine, "INVALID_VALUE", "Cannot parse value at line " + sourceLine));
        continue;
      }
      if (value.compareTo(BigDecimal.ZERO) == 0) {
        rowResults.put(failedImportRow(sourceLine, "ZERO_VALUE", "Value cannot be zero at line " + sourceLine));
        continue;
      }

      String currency = cell(cells, currencyIndex).trim().toUpperCase(Locale.ROOT);
      if (currency.isEmpty()) {
        currency = "EUR";
      }
      String description = nullIfBlank(cell(cells, descriptionIndex));
      String merchant = nullIfBlank(cell(cells, merchantIndex));
      String category = nullIfBlank(cell(cells, categoryIndex));
      List<String> tagNames = parseTagNames(cell(cells, tagsIndex));
      TransferDescriptor transferDescriptor = parseTransferDescriptor(description, accountName, value);
      if (transferDescriptor != null && value.compareTo(BigDecimal.ZERO) > 0) {
        rowResults.put(
          skippedImportRow(
            sourceLine,
            "TRANSFER_PAIR_ROW",
            "Mirrored transfer row skipped at line " + sourceLine
          )
        );
        continue;
      }
      String fingerprint = MobillsImportFingerprint.fromRow(
        accountName,
        occurredAt,
        value,
        currency,
        description,
        merchant
      );
      String duplicateTransactionId = ledgerCore.findMobillsImportTransactionId(fingerprint);
      if (duplicateTransactionId != null && !"import_anyway".equals(duplicatePolicy)) {
        ledgerCore.touchMobillsImportFingerprint(fingerprint);
        if ("fail".equals(duplicatePolicy)) {
          rowResults.put(
            failedImportRow(
              sourceLine,
              "DUPLICATE_TRANSACTION",
              "Duplicate transaction detected (existing transactionId=" + duplicateTransactionId + ")"
            )
          );
        } else {
          rowResults.put(
            skippedImportRow(
              sourceLine,
              "DUPLICATE_TRANSACTION",
              "Duplicate transaction skipped (existing transactionId=" + duplicateTransactionId + ")"
            )
          );
        }
        continue;
      }

      try {
        String transactionId;
        if (transferDescriptor != null && value.compareTo(BigDecimal.ZERO) < 0) {
          AndroidLedgerCore.LedgerAccountView fromAccount = resolveImportAccount(
            ledgerCore,
            cachedAccounts,
            transferDescriptor.outAccountName(),
            currency,
            createMissingAccounts
          );
          AndroidLedgerCore.LedgerAccountView toAccount = resolveImportAccount(
            ledgerCore,
            cachedAccounts,
            transferDescriptor.inAccountName(),
            currency,
            createMissingAccounts
          );
          String amount = value.abs().toPlainString();
          AndroidLedgerCore.LedgerTransferResultView transferResult = ledgerCore.recordTransfer(
            fromAccount.id(),
            toAccount.id(),
            occurredAt,
            amount,
            currency,
            description
          );
          transactionId = transferResult.transferOutId();

          if (!tagNames.isEmpty()) {
            if (!createMissingTags) {
              throw new IllegalStateException("TAG_AUTOCREATE_DISABLED");
            }
            JSONArray tags = new JSONArray();
            for (String tagName : tagNames) {
              tags.put(tagName);
            }
            JSObject outTagging = applyTagsToTransaction(transferResult.transferOutId(), tags);
            if ("failed".equalsIgnoreCase(outTagging.getString("status"))) {
              String code = outTagging.getString("errorCode");
              String message = outTagging.getString("errorMessage");
              throw new IllegalStateException(code != null ? code : message);
            }
            JSObject inTagging = applyTagsToTransaction(transferResult.transferInId(), tags);
            if ("failed".equalsIgnoreCase(inTagging.getString("status"))) {
              String code = inTagging.getString("errorCode");
              String message = inTagging.getString("errorMessage");
              throw new IllegalStateException(code != null ? code : message);
            }
          }
        } else {
          AndroidLedgerCore.LedgerAccountView account = resolveImportAccount(
            ledgerCore,
            cachedAccounts,
            accountName,
            currency,
            createMissingAccounts
          );

          boolean expense = value.compareTo(BigDecimal.ZERO) < 0;
          String amount = value.abs().toPlainString();
          String transactionType = expense ? "expense" : "income";
          transactionId = expense
            ? ledgerCore.recordExpense(account.id(), occurredAt, amount, currency, description, merchant, null).toString()
            : ledgerCore.recordIncome(account.id(), occurredAt, amount, currency, description, merchant, null).toString();

          if (category != null) {
            String categoryId = findCategoryId(taxonomyCore, transactionType, category);
            if (categoryId == null) {
              if (!createMissingCategories) {
                throw new IllegalStateException("CATEGORY_AUTOCREATE_DISABLED");
              }
              categoryId = taxonomyCore.createCategory(category, transactionType).toString();
            }

            AndroidTaxonomyCore.TaxonomyCategorizationResultView categorization =
              taxonomyCore.categorizeTransaction(transactionId, transactionType, categoryId);
            if ("failed".equalsIgnoreCase(categorization.status())) {
              throw new IllegalStateException(categorization.errorCode() != null ? categorization.errorCode() : categorization.errorMessage());
            }
          }

          if (!tagNames.isEmpty()) {
            if (!createMissingTags) {
              throw new IllegalStateException("TAG_AUTOCREATE_DISABLED");
            }
            JSONArray tags = new JSONArray();
            for (String tagName : tagNames) {
              tags.put(tagName);
            }
            JSObject tagging = applyTagsToTransaction(transactionId, tags);
            if ("failed".equalsIgnoreCase(tagging.getString("status"))) {
              String code = tagging.getString("errorCode");
              String message = tagging.getString("errorMessage");
              throw new IllegalStateException(code != null ? code : message);
            }
          }
        }

        JSObject imported = new JSObject();
        imported.put("sourceLine", sourceLine);
        imported.put("status", "imported");
        imported.put("transactionId", transactionId);
        rowResults.put(imported);
        ledgerCore.recordMobillsImportFingerprint(fingerprint, transactionId);
      } catch (RuntimeException ex) {
        String message = ex.getMessage() == null ? "Import failed" : ex.getMessage();
        rowResults.put(
          failedImportRow(
            sourceLine,
            toErrorCode(message),
            message
          )
        );
      }
    }

    return buildImportResponse(rowResults);
  }

  private JSObject buildImportResponse(JSONArray rows) throws JSONException {
    int importedCount = 0;
    int failedCount = 0;
    int skippedCount = 0;
    for (int index = 0; index < rows.length(); index++) {
      String status = rows.getJSONObject(index).optString("status", "failed");
      if ("imported".equalsIgnoreCase(status)) {
        importedCount += 1;
      } else if ("skipped".equalsIgnoreCase(status)) {
        skippedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    JSObject result = new JSObject();
    result.put("totalRows", rows.length());
    result.put("importedCount", importedCount);
    result.put("failedCount", failedCount);
    result.put("skippedCount", skippedCount);
    result.put("rows", rows);
    return result;
  }

  private JSObject failedImportRow(int sourceLine, String errorCode, String errorMessage) {
    JSObject failed = new JSObject();
    failed.put("sourceLine", sourceLine);
    failed.put("status", "failed");
    failed.put("errorCode", errorCode);
    failed.put("errorMessage", errorMessage);
    return failed;
  }

  private JSObject skippedImportRow(int sourceLine, String errorCode, String errorMessage) {
    JSObject skipped = new JSObject();
    skipped.put("sourceLine", sourceLine);
    skipped.put("status", "skipped");
    skipped.put("errorCode", errorCode);
    skipped.put("errorMessage", errorMessage);
    return skipped;
  }

  private JSObject applyTagsToTransaction(String transactionId, JSONArray tagNames) throws JSONException {
    LinkedHashMap<String, String> uniqueByNormalizedName = new LinkedHashMap<>();
    if (tagNames != null) {
      for (int i = 0; i < tagNames.length(); i++) {
        String rawTag = tagNames.optString(i, "").trim();
        if (rawTag.isEmpty()) {
          continue;
        }
        String normalizedTag = rawTag.toLowerCase(Locale.ROOT);
        if (!uniqueByNormalizedName.containsKey(normalizedTag)) {
          uniqueByNormalizedName.put(normalizedTag, rawTag);
        }
      }
    }

    AndroidTaxonomyCore core = AndroidTaxonomyCore.getInstance(getContext());
    AndroidTaxonomyCore.TaxonomyTaggingResultView tagging =
      core.applyTagsToTransaction(transactionId, new ArrayList<>(uniqueByNormalizedName.values()));

    JSObject result = new JSObject();
    result.put("status", tagging.status());
    if (tagging.errorCode() != null) {
      result.put("errorCode", tagging.errorCode());
    }
    if (tagging.errorMessage() != null) {
      result.put("errorMessage", tagging.errorMessage());
    }
    JSONArray resolvedTagIds = new JSONArray();
    for (String tagId : tagging.tagIds()) {
      resolvedTagIds.put(tagId);
    }
    result.put("tagIds", resolvedTagIds);
    return result;
  }

  private String decodeMobillsText(byte[] bytes) {
    String utf16 = new String(bytes, StandardCharsets.UTF_16).replace("\uFEFF", "");
    if (utf16.contains("\t") || utf16.contains("\n")) {
      return utf16;
    }
    return new String(bytes, StandardCharsets.UTF_8).replace("\uFEFF", "");
  }

  private int findHeaderIndex(List<String> headerCells, String... aliases) {
    List<String> normalizedAliases = new ArrayList<>();
    for (String alias : aliases) {
      normalizedAliases.add(normalizeHeader(alias));
    }
    for (int index = 0; index < headerCells.size(); index++) {
      String normalizedHeader = normalizeHeader(headerCells.get(index));
      if (normalizedAliases.contains(normalizedHeader)) {
        return index;
      }
    }
    return -1;
  }

  private String normalizeHeader(String raw) {
    return raw
      .trim()
      .toLowerCase(Locale.ROOT)
      .replaceAll("[^a-z0-9]", "");
  }

  private String cell(List<String> cells, int index) {
    if (index < 0 || index >= cells.size()) {
      return "";
    }
    return cells.get(index);
  }

  private String nullIfBlank(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private BigDecimal parseMobillsValue(String rawValue) {
    String value = rawValue == null ? "" : rawValue.trim();
    if (value.isEmpty()) {
      return null;
    }
    String normalized = value
      .replace(" ", "")
      .replace("\u00A0", "")
      .replace("€", "")
      .replace("$", "")
      .replace("£", "")
      .replace("+", "");

    if (normalized.contains(",") && normalized.contains(".")) {
      int commaPos = normalized.lastIndexOf(',');
      int dotPos = normalized.lastIndexOf('.');
      if (commaPos > dotPos) {
        normalized = normalized.replace(".", "").replace(",", ".");
      } else {
        normalized = normalized.replace(",", "");
      }
    } else if (normalized.contains(",")) {
      normalized = normalized.replace(",", ".");
    }

    try {
      return new BigDecimal(normalized);
    } catch (NumberFormatException ex) {
      return null;
    }
  }

  private String parseMobillsDate(String rawValue) {
    String value = rawValue == null ? "" : rawValue.trim();
    if (value.isEmpty()) {
      return null;
    }

    try {
      return Instant.parse(value).toString();
    } catch (DateTimeParseException ignored) {
      // fallback formats below
    }

    DateTimeFormatter[] dateTimeFormats = new DateTimeFormatter[] {
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
      DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
      DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"),
    };
    for (DateTimeFormatter formatter : dateTimeFormats) {
      try {
        return LocalDateTime.parse(value, formatter).toInstant(ZoneOffset.UTC).toString();
      } catch (DateTimeParseException ignored) {
        // try next
      }
    }

    DateTimeFormatter[] dateFormats = new DateTimeFormatter[] {
      DateTimeFormatter.ISO_LOCAL_DATE,
      DateTimeFormatter.ofPattern("dd/MM/yyyy"),
      DateTimeFormatter.ofPattern("MM/dd/yyyy"),
    };
    for (DateTimeFormatter formatter : dateFormats) {
      try {
        return LocalDate.parse(value, formatter).atStartOfDay().toInstant(ZoneOffset.UTC).toString();
      } catch (DateTimeParseException ignored) {
        // try next
      }
    }
    return null;
  }

  private List<String> parseTagNames(String rawTags) {
    if (rawTags == null || rawTags.trim().isEmpty()) {
      return new ArrayList<>();
    }
    LinkedHashMap<String, String> uniqueByNormalizedName = new LinkedHashMap<>();
    String[] chunks = rawTags.split("[|,;]");
    for (String chunk : chunks) {
      String tag = chunk.trim();
      if (tag.isEmpty()) {
        continue;
      }
      String normalized = tag.toLowerCase(Locale.ROOT);
      if (!uniqueByNormalizedName.containsKey(normalized)) {
        uniqueByNormalizedName.put(normalized, tag);
      }
    }
    return new ArrayList<>(uniqueByNormalizedName.values());
  }

  private AndroidLedgerCore.LedgerAccountView resolveImportAccount(
    AndroidLedgerCore ledgerCore,
    List<AndroidLedgerCore.LedgerAccountView> cachedAccounts,
    String accountName,
    String currency,
    boolean createMissingAccounts
  ) {
    AndroidLedgerCore.LedgerAccountView account = findAccount(cachedAccounts, accountName, currency);
    if (account == null) {
      if (!createMissingAccounts) {
        throw new IllegalStateException("ACCOUNT_NOT_FOUND:" + accountName + ":" + currency);
      }
      String createdAccountId = ledgerCore.openAccount(accountName, "cash", currency, null, null).toString();
      cachedAccounts.clear();
      cachedAccounts.addAll(ledgerCore.listAccounts());
      account = findAccountById(cachedAccounts, createdAccountId);
    }
    if (account == null) {
      throw new IllegalStateException("Account not found: " + accountName);
    }
    return account;
  }

  private TransferDescriptor parseTransferDescriptor(String description, String rowAccountName, BigDecimal value) {
    String normalizedDescription = nullIfBlank(description);
    String normalizedRowAccount = nullIfBlank(rowAccountName);
    if (normalizedDescription == null || normalizedRowAccount == null || value == null) {
      return null;
    }
    if (!normalizedDescription.regionMatches(true, 0, "Transfer ", 0, 9)) {
      return null;
    }
    String body = normalizedDescription.substring(9).trim();
    if (body.isEmpty()) {
      return null;
    }

    if (value.compareTo(BigDecimal.ZERO) < 0) {
      if (body.length() <= normalizedRowAccount.length()) {
        return null;
      }
      if (!body.regionMatches(true, 0, normalizedRowAccount, 0, normalizedRowAccount.length())) {
        return null;
      }
      String inAccountName = body.substring(normalizedRowAccount.length()).trim();
      if (inAccountName.isEmpty()) {
        return null;
      }
      return new TransferDescriptor(normalizedRowAccount, inAccountName);
    }

    if (value.compareTo(BigDecimal.ZERO) > 0) {
      if (body.length() <= normalizedRowAccount.length()) {
        return null;
      }
      int suffixStart = body.length() - normalizedRowAccount.length();
      if (!body.regionMatches(true, suffixStart, normalizedRowAccount, 0, normalizedRowAccount.length())) {
        return null;
      }
      String outAccountName = body.substring(0, suffixStart).trim();
      if (outAccountName.isEmpty()) {
        return null;
      }
      return new TransferDescriptor(outAccountName, normalizedRowAccount);
    }
    return null;
  }

  private AndroidLedgerCore.LedgerAccountView findAccount(
    List<AndroidLedgerCore.LedgerAccountView> accounts,
    String accountName,
    String currency
  ) {
    for (AndroidLedgerCore.LedgerAccountView account : accounts) {
      boolean sameName = account.name().trim().equalsIgnoreCase(accountName.trim());
      boolean sameCurrency = account.currency().equalsIgnoreCase(currency);
      if (sameName && sameCurrency) {
        return account;
      }
    }
    return null;
  }

  private AndroidLedgerCore.LedgerAccountView findAccountById(
    List<AndroidLedgerCore.LedgerAccountView> accounts,
    String accountId
  ) {
    for (AndroidLedgerCore.LedgerAccountView account : accounts) {
      if (account.id().equals(accountId)) {
        return account;
      }
    }
    return null;
  }

  private String findCategoryId(AndroidTaxonomyCore taxonomyCore, String transactionType, String categoryName) {
    List<AndroidTaxonomyCore.TaxonomyCategoryView> categories = taxonomyCore.listCategories(transactionType, false);
    for (AndroidTaxonomyCore.TaxonomyCategoryView category : categories) {
      if (category.name().trim().equalsIgnoreCase(categoryName.trim())) {
        return category.id();
      }
    }
    return null;
  }

  private String toErrorCode(String message) {
    String raw = message == null ? "" : message.trim();
    if (raw.isEmpty()) {
      return "IMPORT_FAILED";
    }
    String normalized = raw.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_").replaceAll("^_+|_+$", "");
    if (normalized.isEmpty()) {
      return "IMPORT_FAILED";
    }
    return normalized;
  }

  private String normalizeDuplicatePolicy(String rawValue) {
    String value = rawValue == null ? "" : rawValue.trim().toLowerCase(Locale.ROOT);
    if ("fail".equals(value) || "import_anyway".equals(value)) {
      return value;
    }
    return "skip";
  }

  private record TransferDescriptor(
    String outAccountName,
    String inAccountName
  ) {}
}
