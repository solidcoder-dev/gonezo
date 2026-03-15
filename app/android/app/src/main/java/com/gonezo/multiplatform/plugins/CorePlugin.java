package com.gonezo.multiplatform.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.gonezo.multiplatform.core.AndroidLedgerCore;

@CapacitorPlugin(name = "CorePlugin")
public class CorePlugin extends Plugin {

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

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      String id = core.openAccount(name, type, currency, createdAt).toString();
      JSObject result = new JSObject();
      result.put("id", id);
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
}
