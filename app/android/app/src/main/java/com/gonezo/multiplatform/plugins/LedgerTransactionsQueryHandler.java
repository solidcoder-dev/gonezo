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

final class LedgerTransactionsQueryHandler {
  private final Context context;

  LedgerTransactionsQueryHandler(Context context) {
    this.context = context;
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

      java.util.Set<String> categoryFilter = categoryIds == null || categoryIds.isEmpty()
        ? null
        : new java.util.HashSet<>(categoryIds);
      java.util.Set<String> tagFilter = tagIds == null || tagIds.isEmpty()
        ? null
        : new java.util.HashSet<>(tagIds);

      boolean needsPostFiltering = categoryFilter != null || tagFilter != null || amountMin != null || amountMax != null;
      if (!needsPostFiltering) {
        AndroidLedgerCore.LedgerTransactionPageView pageResult = ledgerCore.listTransactions(
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
          new AndroidLedgerCore.LedgerPageRequestInput(requestedPage, pageSize),
          resolvedSort
        );
        List<String> transactionIds = pageResult.content().stream().map(AndroidLedgerCore.LedgerTransactionView::id).toList();
        Map<String, AndroidTaxonomyCore.TransactionTaxonomyView> taxonomyByTransactionId =
          taxonomyCore.listTransactionTaxonomy(transactionIds);
        call.resolve(toTransactionPageJson(
          pageResult.content(),
          taxonomyByTransactionId,
          pageResult.page(),
          pageResult.size(),
          pageResult.totalElements(),
          pageResult.totalPages(),
          pageResult.hasNext(),
          pageResult.hasPrevious()
        ));
        return;
      }

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

      call.resolve(toTransactionPageJson(
        pageTransactions,
        taxonomyByTransactionId,
        resolvedPage,
        pageSize,
        totalElements,
        totalPages,
        totalPages > 0 && resolvedPage + 1 < totalPages,
        resolvedPage > 0
      ));
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
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

  private JSObject toTransactionPageJson(
    List<AndroidLedgerCore.LedgerTransactionView> transactions,
    Map<String, AndroidTaxonomyCore.TransactionTaxonomyView> taxonomyByTransactionId,
    int page,
    int size,
    int totalElements,
    int totalPages,
    boolean hasNext,
    boolean hasPrevious
  ) {
    JSONArray items = new JSONArray();
    for (AndroidLedgerCore.LedgerTransactionView tx : transactions) {
      items.put(toTransactionJson(tx, taxonomyByTransactionId.get(tx.id())));
    }

    JSObject result = new JSObject();
    result.put("content", items);
    result.put("items", items);
    result.put("page", page);
    result.put("size", size);
    result.put("totalElements", totalElements);
    result.put("totalPages", totalPages);
    result.put("hasNext", hasNext);
    result.put("hasPrevious", hasPrevious);
    return result;
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
