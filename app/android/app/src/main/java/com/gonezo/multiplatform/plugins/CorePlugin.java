package com.gonezo.multiplatform.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.gonezo.multiplatform.core.AndroidCore;

@CapacitorPlugin(name = "CorePlugin")
public class CorePlugin extends Plugin {

  @PluginMethod
  public void doThing(PluginCall call) {
    String input = call.getString("input", "");
    String message = com.gonezo.application.CorePing.doThing(input);

    JSObject result = new JSObject();
    result.put("status", "ok");
    result.put("message", message);

    call.resolve(result);
  }

  @PluginMethod
  public void createAccount(PluginCall call) {
    String name = call.getString("name", "");
    String userId = call.getString("userId");
    String type = call.getString("type");
    String currency = call.getString("currency");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      String id = core.createAccount(name, userId, type, currency).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void postExpense(PluginCall call) {
    String accountId = call.getString("accountId");
    String postedDate = call.getString("postedDate");
    String effectiveDate = call.getString("effectiveDate");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String merchant = call.getString("merchant");
    String categoryId = call.getString("categoryId");
    Boolean recurring = call.getBoolean("recurring");
    String reservationId = call.getString("reservationId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      String id = core.postExpense(
        accountId,
        postedDate,
        effectiveDate,
        amount,
        currency,
        merchant,
        categoryId,
        recurring,
        reservationId
      ).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void postTransfer(PluginCall call) {
    String fromAccountId = call.getString("fromAccountId");
    String toAccountId = call.getString("toAccountId");
    String postedDate = call.getString("postedDate");
    String effectiveDate = call.getString("effectiveDate");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String fromCategoryId = call.getString("fromCategoryId");
    String toCategoryId = call.getString("toCategoryId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      java.util.List<java.util.UUID> ids = core.postTransfer(
        fromAccountId,
        toAccountId,
        postedDate,
        effectiveDate,
        amount,
        currency,
        fromCategoryId,
        toCategoryId
      );
      JSObject result = new JSObject();
      result.put("ids", new org.json.JSONArray(ids.stream().map(java.util.UUID::toString).toList()));
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void postIncome(PluginCall call) {
    String budgetPlanId = call.getString("budgetPlanId");
    String accountId = call.getString("accountId");
    String postedDate = call.getString("postedDate");
    String effectiveDate = call.getString("effectiveDate");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String merchant = call.getString("merchant");
    String categoryId = call.getString("categoryId");
    Boolean recurring = call.getBoolean("recurring");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      String id = core.postIncome(
        budgetPlanId,
        accountId,
        postedDate,
        effectiveDate,
        amount,
        currency,
        merchant,
        categoryId,
        recurring
      ).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void createBudgetPeriod(PluginCall call) {
    String planId = call.getString("planId");
    Integer year = call.getInt("year");
    Integer month = call.getInt("month");
    String currency = call.getString("currency");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      String id = core.createBudgetPeriod(planId, year, month, currency).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void allocateBudget(PluginCall call) {
    String periodId = call.getString("periodId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      core.allocateBudget(periodId);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void getCategoryBalances(PluginCall call) {
    String periodId = call.getString("periodId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      java.util.List<AndroidCore.CategoryBalanceView> balances = core.getCategoryBalances(periodId);

      org.json.JSONArray items = new org.json.JSONArray();
      for (AndroidCore.CategoryBalanceView balance : balances) {
        JSObject item = new JSObject();
        item.put("categoryId", balance.categoryId());
        item.put("availableAmount", balance.availableAmount());
        item.put("currency", balance.currency());
        item.put("safeToSpendAmount", balance.safeToSpendAmount());
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
  public void createPeriodReservations(PluginCall call) {
    String periodId = call.getString("periodId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      core.createPeriodReservations(periodId);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void getPeriodReservations(PluginCall call) {
    String periodId = call.getString("periodId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      java.util.List<AndroidCore.ReservationView> reservations = core.getPeriodReservations(periodId);

      org.json.JSONArray items = new org.json.JSONArray();
      for (AndroidCore.ReservationView reservation : reservations) {
        JSObject item = new JSObject();
        item.put("id", reservation.id());
        item.put("budgetPeriodId", reservation.budgetPeriodId());
        item.put("patternId", reservation.patternId());
        item.put("categoryId", reservation.categoryId());
        item.put("amount", reservation.amount());
        item.put("currency", reservation.currency());
        item.put("status", reservation.status());
        item.put("expectedEffectiveDate", reservation.expectedEffectiveDate());
        item.put("linkedTransactionId", reservation.linkedTransactionId());
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
  public void settleReservation(PluginCall call) {
    String reservationId = call.getString("reservationId");
    String transactionId = call.getString("transactionId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      core.settleReservation(reservationId, transactionId);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void closePeriod(PluginCall call) {
    String periodId = call.getString("periodId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      core.closePeriod(periodId);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void executeInvestment(PluginCall call) {
    String containerId = call.getString("containerId");
    String date = call.getString("date");
    String type = call.getString("type");
    String assetId = call.getString("assetId");
    String quantity = call.getString("quantity");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String feesAmount = call.getString("feesAmount");
    String taxesAmount = call.getString("taxesAmount");
    String note = call.getString("note");
    String budgetPeriodId = call.getString("budgetPeriodId");
    String categoryId = call.getString("categoryId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      String id = core.executeInvestment(
        containerId,
        date,
        type,
        assetId,
        quantity,
        amount,
        currency,
        feesAmount,
        taxesAmount,
        note,
        budgetPeriodId,
        categoryId
      ).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void recordInvestmentReturn(PluginCall call) {
    String containerId = call.getString("containerId");
    String date = call.getString("date");
    String amount = call.getString("amount");
    String currency = call.getString("currency");
    String note = call.getString("note");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      String id = core.recordInvestmentReturn(
        containerId,
        date,
        amount,
        currency,
        note
      ).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void getInvestmentTransactions(PluginCall call) {
    String containerId = call.getString("containerId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      java.util.List<AndroidCore.InvestmentTransactionView> transactions = core.getInvestmentTransactions(containerId);

      org.json.JSONArray items = new org.json.JSONArray();
      for (AndroidCore.InvestmentTransactionView tx : transactions) {
        JSObject item = new JSObject();
        item.put("id", tx.id());
        item.put("containerId", tx.containerId());
        item.put("date", tx.date());
        item.put("type", tx.type());
        item.put("assetId", tx.assetId());
        item.put("quantity", tx.quantity());
        item.put("amount", tx.amount());
        item.put("currency", tx.currency());
        item.put("feesAmount", tx.feesAmount());
        item.put("taxesAmount", tx.taxesAmount());
        item.put("note", tx.note());
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
  public void getBudgetPeriod(PluginCall call) {
    String periodId = call.getString("periodId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      AndroidCore.BudgetPeriodView period = core.getBudgetPeriod(periodId);
      JSObject result = new JSObject();
      result.put("id", period.id());
      result.put("budgetPlanId", period.budgetPlanId());
      result.put("year", period.year());
      result.put("month", period.month());
      result.put("incomeTotalAmount", period.incomeTotalAmount());
      result.put("incomeTotalCurrency", period.incomeTotalCurrency());
      result.put("remainderAmount", period.remainderAmount());
      result.put("remainderCurrency", period.remainderCurrency());
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void getBudgetLinks(PluginCall call) {
    String periodId = call.getString("periodId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      java.util.List<AndroidCore.BudgetLinkView> links = core.getBudgetLinks(periodId);

      org.json.JSONArray items = new org.json.JSONArray();
      for (AndroidCore.BudgetLinkView link : links) {
        JSObject item = new JSObject();
        item.put("id", link.id());
        item.put("budgetPeriodId", link.budgetPeriodId());
        item.put("categoryId", link.categoryId());
        item.put("linkedType", link.linkedType());
        item.put("linkedId", link.linkedId());
        item.put("budgetImpactAmount", link.budgetImpactAmount());
        item.put("budgetImpactCurrency", link.budgetImpactCurrency());
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
  public void listAccounts(PluginCall call) {
    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      java.util.List<AndroidCore.AccountView> accounts = core.listAccounts();

      org.json.JSONArray items = new org.json.JSONArray();
      for (AndroidCore.AccountView account : accounts) {
        JSObject item = new JSObject();
        item.put("id", account.id());
        item.put("name", account.name());
        item.put("type", account.type());
        item.put("currency", account.currency());
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
  public void getAccountSummary(PluginCall call) {
    String accountId = call.getString("accountId");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      AndroidCore.AccountSummaryView summary = core.getAccountSummary(accountId);
      JSObject result = new JSObject();
      result.put("accountId", summary.accountId());
      result.put("name", summary.name());
      result.put("type", summary.type());
      result.put("currency", summary.currency());
      result.put("netAmount", summary.netAmount());
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void listExpenses(PluginCall call) {
    String accountId = call.getString("accountId");
    Integer limit = call.getInt("limit");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      java.util.List<AndroidCore.ExpenseView> expenses = core.listExpenses(accountId, limit);

      org.json.JSONArray items = new org.json.JSONArray();
      for (AndroidCore.ExpenseView expense : expenses) {
        JSObject item = new JSObject();
        item.put("id", expense.id());
        item.put("postedDate", expense.postedDate());
        item.put("merchant", expense.merchant());
        item.put("amount", expense.amount());
        item.put("currency", expense.currency());
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
