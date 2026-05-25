package com.gonezo.multiplatform.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidExpectedCore;
import com.gonezo.multiplatform.core.AndroidMovementsBackupCore;
import com.gonezo.multiplatform.core.AndroidPreferencesCore;
import com.gonezo.multiplatform.core.AndroidRecurringCore;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import com.gonezo.application.orchestration.backup.ImportMovementsBackupResult;
import com.gonezo.preferences.domain.UserPreferences;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "CorePlugin")
public class CorePlugin extends Plugin {
  @PluginMethod
  public void preferencesGet(PluginCall call) {
    try {
      AndroidPreferencesCore core = AndroidPreferencesCore.getInstance(getContext());
      UserPreferences preferences = core.getPreferences();
      JSObject result = new JSObject();
      if (preferences.getDefaultAccountId() == null) {
        result.put("defaultAccountId", JSONObject.NULL);
      } else {
        result.put("defaultAccountId", preferences.getDefaultAccountId().getValue());
      }
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void preferencesSetDefaultAccount(PluginCall call) {
    String accountId = call.getString("accountId");

    try {
      AndroidPreferencesCore core = AndroidPreferencesCore.getInstance(getContext());
      core.setDefaultAccount(accountId);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void preferencesClearDefaultAccount(PluginCall call) {
    try {
      AndroidPreferencesCore core = AndroidPreferencesCore.getInstance(getContext());
      core.clearDefaultAccount();
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

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
  public void ledgerRestoreAccount(PluginCall call) {
    String accountId = call.getString("accountId");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      core.restoreAccount(accountId);
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
        item.put("linkedTransactionId", tx.linkedTransactionId());
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
  public void taxonomyRenameCategory(PluginCall call) {
    String categoryId = call.getString("categoryId");
    String name = call.getString("name");

    try {
      AndroidTaxonomyCore core = AndroidTaxonomyCore.getInstance(getContext());
      core.renameCategory(categoryId, name);
      call.resolve();
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
  public void taxonomyRenameTag(PluginCall call) {
    String tagId = call.getString("tagId");
    String name = call.getString("name");

    try {
      AndroidTaxonomyCore core = AndroidTaxonomyCore.getInstance(getContext());
      core.renameTag(tagId, name);
      call.resolve();
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

    try {
      JSObject result = new MobillsImportHandler(getContext()).importBase64(fileBase64, call.getObject("policy"));
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
      JSObject result = TransactionTaggingBridge.applyTagsToTransaction(getContext(), transactionId, tagNames);
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
  public void movementsExportBackup(PluginCall call) {
    try {
      call.resolve(new MovementsBackupHandler(getContext()).exportBackup());
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void movementsImportBackup(PluginCall call) {
    String fileBase64 = call.getString("fileBase64");
    if (fileBase64 == null || fileBase64.trim().isEmpty()) {
      call.reject("fileBase64 is required");
      return;
    }

    try {
      byte[] bytes = Base64.getDecoder().decode(fileBase64);
      ImportMovementsBackupResult importResult = AndroidMovementsBackupCore
        .getInstance(getContext())
        .importBackup(bytes);
      call.resolve(MovementsBackupHandler.toJson(importResult));
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
    JSONArray splitItems = call.getArray("splitItems");
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
          splitItems == null ? null : splitItems.toString(),
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
  public void recurrenceUpdateRecurringMovement(PluginCall call) {
    String recurringMovementId = call.getString("recurringMovementId");
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
    JSONArray splitItems = call.getArray("splitItems");
    JSObject rule = call.getObject("rule");
    JSObject recurrenceEnd = call.getObject("recurrenceEnd");

    try {
      AndroidRecurringCore recurrenceCore = AndroidRecurringCore.getInstance(getContext());
      UUID id = recurrenceCore.updateRecurringMovement(
        new AndroidRecurringCore.UpdateRecurringMovementInput(
          recurringMovementId,
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
          splitItems == null ? null : splitItems.toString(),
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
    JSONArray splitItems = call.getArray("splitItems");

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
        categoryId,
        splitItems == null ? null : splitItems.toString()
      );
      JSObject result = new JSObject();
      result.put("id", id.toString());
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void expectedUpdateMovement(PluginCall call) {
    String expectedMovementId = call.getString("expectedMovementId");
    String accountId = call.getString("accountId");
    String type = call.getString("type");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String expectedAt = call.getString("expectedAt");
    String description = call.getString("description");
    String merchant = call.getString("merchant");
    String categoryId = call.getString("categoryId");
    JSONArray splitItems = call.getArray("splitItems");

    try {
      AndroidExpectedCore expectedCore = AndroidExpectedCore.getInstance(getContext());
      UUID id = expectedCore.updateMovement(
        expectedMovementId,
        accountId,
        type,
        amount,
        currency,
        expectedAt,
        description,
        merchant,
        categoryId,
        splitItems == null ? null : splitItems.toString()
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
    JSONArray splitItems = new JSONArray();
    for (AndroidRecurringCore.SplitItem item : movement.getSplitItems()) {
      JSObject split = new JSObject();
      split.put("id", item.getId());
      split.put("name", item.getName());
      split.put("amount", item.getAmount());
      splitItems.put(split);
    }
    result.put("splitItems", splitItems);
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
    JSONArray splitItems = new JSONArray();
    for (AndroidExpectedCore.SplitItem item : movement.getSplitItems()) {
      JSObject split = new JSObject();
      split.put("id", item.getId());
      split.put("name", item.getName());
      split.put("amount", item.getAmount());
      splitItems.put(split);
    }
    result.put("splitItems", splitItems);
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

  private String nullIfBlank(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

}
