package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

final class LedgerPluginHandler {
  private final Context context;

  LedgerPluginHandler(Context context) {
    this.context = context;
  }

  void ledgerOpenAccount(PluginCall call) {
    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(context);
      String id = core.openAccount(
        call.getString("name"),
        call.getString("type"),
        call.getString("currency"),
        call.getString("createdAt"),
        call.getString("openingBalanceAmount")
      ).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerListSupportedCurrencies(PluginCall call) {
    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(context);
      JSONArray items = new JSONArray();
      for (String currency : core.listSupportedCurrencies()) {
        items.put(currency);
      }
      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerRenameAccount(PluginCall call) {
    try {
      AndroidLedgerCore.getInstance(context).renameAccount(call.getString("accountId"), call.getString("name"));
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerArchiveAccount(PluginCall call) {
    try {
      AndroidLedgerCore.getInstance(context).archiveAccount(call.getString("accountId"), call.getString("archivedAt"));
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerRestoreAccount(PluginCall call) {
    try {
      AndroidLedgerCore.getInstance(context).restoreAccount(call.getString("accountId"));
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerDeleteAccount(PluginCall call) {
    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(context);
      String accountId = call.getString("accountId");
      core.listTransactions(accountId, null, null, null, null, null, true);
      core.deleteAccount(accountId);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerListAccounts(PluginCall call) {
    try {
      JSONArray items = new JSONArray();
      for (AndroidLedgerCore.LedgerAccountView account : AndroidLedgerCore.getInstance(context).listAccounts()) {
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

  void ledgerGetAccountSummary(PluginCall call) {
    try {
      AndroidLedgerCore.LedgerAccountSummaryView summary =
        AndroidLedgerCore.getInstance(context).getAccountSummary(call.getString("accountId"));
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

  void ledgerRecordExpense(PluginCall call) {
    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(context);
      String id = core.recordExpense(
        call.getString("accountId"),
        call.getString("occurredAt"),
        call.getString("amount"),
        call.getString("currency"),
        call.getString("description"),
        call.getString("merchant"),
        call.getString("categoryId")
      ).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerRecordIncome(PluginCall call) {
    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(context);
      String id = core.recordIncome(
        call.getString("accountId"),
        call.getString("occurredAt"),
        call.getString("amount"),
        call.getString("currency"),
        call.getString("description"),
        call.getString("merchant"),
        call.getString("categoryId")
      ).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerRecordTransfer(PluginCall call) {
    try {
      AndroidLedgerCore.LedgerTransferResultView result = AndroidLedgerCore.getInstance(context).recordTransfer(
        call.getString("fromAccountId"),
        call.getString("toAccountId"),
        call.getString("occurredAt"),
        call.getString("amount"),
        call.getString("currency"),
        call.getString("description")
      );
      call.resolve(toTransferResultJson(result));
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerRecordTransferFx(PluginCall call) {
    try {
      AndroidLedgerCore.LedgerTransferResultView result = AndroidLedgerCore.getInstance(context).recordTransferFx(
        call.getString("fromAccountId"),
        call.getString("toAccountId"),
        call.getString("occurredAt"),
        call.getString("sourceAmount"),
        call.getString("sourceCurrency"),
        call.getString("destinationAmount"),
        call.getString("destinationCurrency"),
        call.getString("exchangeRate"),
        call.getString("description")
      );
      call.resolve(toTransferResultJson(result));
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerCreateExpenseDraft(PluginCall call) {
    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(context);
      String id = core.createExpenseDraft(
        call.getString("accountId"),
        call.getString("occurredAt"),
        call.getString("amount"),
        call.getString("currency"),
        call.getString("description"),
        call.getString("merchant"),
        call.getString("categoryId")
      ).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerAddTransactionItem(PluginCall call) {
    try {
      AndroidLedgerCore.getInstance(context).addTransactionItem(
        call.getString("transactionId"),
        call.getString("name"),
        call.getString("amount"),
        call.getString("currency"),
        call.getString("categoryId"),
        call.getString("note")
      );
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerPostDraftTransaction(PluginCall call) {
    try {
      AndroidLedgerCore.getInstance(context).postDraftTransaction(call.getString("transactionId"));
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerVoidTransaction(PluginCall call) {
    try {
      AndroidLedgerCore.getInstance(context).voidTransaction(call.getString("transactionId"));
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void ledgerListTransactions(PluginCall call) {
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

      AndroidLedgerCore ledgerCore = AndroidLedgerCore.getInstance(context);
      AndroidTaxonomyCore taxonomyCore = AndroidTaxonomyCore.getInstance(context);
      List<AndroidLedgerCore.LedgerTransactionView> allTransactions = listAllTransactions(
        ledgerCore,
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

      JSONArray items = new JSONArray();
      for (AndroidLedgerCore.LedgerTransactionView tx : pageTransactions) {
        items.put(toTransactionJson(tx, taxonomyByTransactionId.get(tx.id())));
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

  private JSObject toTransferResultJson(AndroidLedgerCore.LedgerTransferResultView result) {
    JSObject response = new JSObject();
    response.put("transferOutId", result.transferOutId());
    response.put("transferInId", result.transferInId());
    return response;
  }

  private JSObject toTransactionJson(
    AndroidLedgerCore.LedgerTransactionView tx,
    AndroidTaxonomyCore.TransactionTaxonomyView taxonomy
  ) {
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
    String categoryIdValue = taxonomy == null ? null : taxonomy.categoryId();
    if (categoryIdValue == null || categoryIdValue.trim().isEmpty()) {
      categoryIdValue = tx.categoryId();
    }
    item.put("categoryId", categoryIdValue);

    JSONArray txItems = new JSONArray();
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
    return item;
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

  private String nullIfBlank(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }
}
