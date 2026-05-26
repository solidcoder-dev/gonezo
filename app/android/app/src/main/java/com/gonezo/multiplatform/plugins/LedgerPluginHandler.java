package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
import org.json.JSONArray;

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
    new LedgerTransactionsQueryHandler(context).ledgerListTransactions(call);
  }

  private JSObject toTransferResultJson(AndroidLedgerCore.LedgerTransferResultView result) {
    JSObject response = new JSObject();
    response.put("transferOutId", result.transferOutId());
    response.put("transferInId", result.transferInId());
    return response;
  }
}
