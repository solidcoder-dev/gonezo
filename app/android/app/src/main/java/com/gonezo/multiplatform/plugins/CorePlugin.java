package com.gonezo.multiplatform.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.gonezo.multiplatform.core.AndroidLedgerCore;

@CapacitorPlugin(name = "CorePlugin")
public class CorePlugin extends Plugin {
  private final java.util.List<JSObject> taxonomyCategories = new java.util.ArrayList<>();

  @PluginMethod
  public void doThing(PluginCall call) {
    String input = call.getString("input", "");
    JSObject result = new JSObject();
    result.put("status", "ok");
    result.put("message", "ledger plugin ok: " + input);
    call.resolve(result);
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
    Integer limit = call.getInt("limit");
    String fromDate = call.getString("fromDate");
    String toDate = call.getString("toDate");
    String categoryId = call.getString("categoryId");
    String merchant = call.getString("merchant");
    Boolean includeVoided = call.getBoolean("includeVoided");

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      java.util.List<AndroidLedgerCore.LedgerTransactionView> transactions = core.listTransactions(
        accountId,
        limit,
        fromDate,
        toDate,
        categoryId,
        merchant,
        includeVoided
      );

      org.json.JSONArray items = new org.json.JSONArray();
      for (AndroidLedgerCore.LedgerTransactionView tx : transactions) {
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
        item.put("categoryId", tx.categoryId());

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
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void taxonomyListCategories(PluginCall call) {
    String appliesTo = call.getString("appliesTo");
    Boolean includeArchived = call.getBoolean("includeArchived");
    boolean resolvedIncludeArchived = includeArchived != null && includeArchived;

    try {
      org.json.JSONArray items = new org.json.JSONArray();
      for (JSObject category : taxonomyCategories) {
        String categoryStatus = category.getString("status", "active");
        String categoryAppliesTo = category.getString("appliesTo");
        if (!resolvedIncludeArchived && "archived".equalsIgnoreCase(categoryStatus)) {
          continue;
        }
        if (appliesTo != null && !appliesTo.trim().isEmpty() && categoryAppliesTo != null && !categoryAppliesTo.equalsIgnoreCase(appliesTo)) {
          continue;
        }
        JSObject item = new JSObject();
        item.put("id", category.getString("id"));
        item.put("name", category.getString("name"));
        item.put("appliesTo", categoryAppliesTo);
        item.put("status", categoryStatus);
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
    String rawName = call.getString("name");
    String rawAppliesTo = call.getString("appliesTo");
    String name = rawName == null ? "" : rawName.trim();
    String appliesTo = rawAppliesTo == null ? "" : rawAppliesTo.trim().toLowerCase();
    if (name.isEmpty()) {
      call.reject("Category name is required");
      return;
    }
    if (!"expense".equals(appliesTo) && !"income".equals(appliesTo)) {
      call.reject("appliesTo must be expense or income");
      return;
    }

    String normalizedName = name.toLowerCase();
    for (JSObject category : taxonomyCategories) {
      String existingName = category.getString("name", "").trim().toLowerCase();
      String existingAppliesTo = category.getString("appliesTo", "").trim().toLowerCase();
      if (existingName.equals(normalizedName) && existingAppliesTo.equals(appliesTo)) {
        call.reject("Category already exists for " + appliesTo + ": " + name);
        return;
      }
    }

    JSObject created = new JSObject();
    created.put("id", java.util.UUID.randomUUID().toString());
    created.put("name", name);
    created.put("appliesTo", appliesTo);
    created.put("status", "active");
    taxonomyCategories.add(created);

    JSObject result = new JSObject();
    result.put("id", created.getString("id"));
    call.resolve(result);
  }

  @PluginMethod
  public void orchestrationCategorizeTransaction(PluginCall call) {
    String transactionId = call.getString("transactionId");
    String transactionType = call.getString("transactionType");
    String categoryId = call.getString("categoryId");
    if (transactionId == null || transactionId.trim().isEmpty()) {
      call.reject("transactionId is required");
      return;
    }
    if (transactionType == null || transactionType.trim().isEmpty()) {
      call.reject("transactionType is required");
      return;
    }

    String normalizedType = transactionType.trim().toLowerCase();
    if (!"expense".equals(normalizedType) && !"income".equals(normalizedType)) {
      call.reject("Only income/expense transactions can be categorized");
      return;
    }

    try {
      JSObject result = new JSObject();
      if (categoryId == null || categoryId.trim().isEmpty()) {
        result.put("status", "none");
        call.resolve(result);
        return;
      }

      JSObject category = null;
      for (JSObject item : taxonomyCategories) {
        if (categoryId.equals(item.getString("id"))) {
          category = item;
          break;
        }
      }
      if (category == null) {
        result.put("status", "failed");
        result.put("categoryId", categoryId);
        result.put("errorCode", "CATEGORY_NOT_FOUND");
        result.put("errorMessage", "Category not found: " + categoryId);
        call.resolve(result);
        return;
      }

      String categoryStatus = category.getString("status", "active");
      String categoryAppliesTo = category.getString("appliesTo", "").trim().toLowerCase();
      if (!"active".equalsIgnoreCase(categoryStatus)) {
        result.put("status", "failed");
        result.put("categoryId", categoryId);
        result.put("errorCode", "CATEGORY_ARCHIVED");
        result.put("errorMessage", "Archived categories cannot be assigned");
        call.resolve(result);
        return;
      }
      if (!normalizedType.equals(categoryAppliesTo)) {
        result.put("status", "failed");
        result.put("categoryId", categoryId);
        result.put("errorCode", "CATEGORY_APPLIES_TO_MISMATCH");
        result.put("errorMessage", "Category applies to " + categoryAppliesTo + ", got " + normalizedType);
        call.resolve(result);
        return;
      }

      result.put("status", "assigned");
      result.put("categoryId", categoryId);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }
}
