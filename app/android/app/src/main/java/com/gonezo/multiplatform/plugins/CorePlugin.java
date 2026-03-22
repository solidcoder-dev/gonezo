package com.gonezo.multiplatform.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;

@CapacitorPlugin(name = "CorePlugin")
public class CorePlugin extends Plugin {
  private final java.util.List<JSObject> taxonomyTags = new java.util.ArrayList<>();
  private final java.util.Map<String, java.util.List<String>> transactionTagsByTransactionId = new java.util.HashMap<>();

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
    boolean resolvedIncludeArchived = includeArchived != null && includeArchived;

    try {
      org.json.JSONArray items = new org.json.JSONArray();
      for (JSObject tag : taxonomyTags) {
        String tagStatus = tag.getString("status", "active");
        if (!resolvedIncludeArchived && "archived".equalsIgnoreCase(tagStatus)) {
          continue;
        }
        JSObject item = new JSObject();
        item.put("id", tag.getString("id"));
        item.put("name", tag.getString("name"));
        item.put("status", tagStatus);
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
    org.json.JSONArray tagNames = call.getArray("tagNames");
    if (transactionId == null || transactionId.trim().isEmpty()) {
      call.reject("transactionId is required");
      return;
    }

    try {
      java.util.LinkedHashMap<String, String> uniqueByNormalizedName = new java.util.LinkedHashMap<>();
      if (tagNames != null) {
        for (int i = 0; i < tagNames.length(); i++) {
          String rawTag = tagNames.optString(i, "").trim();
          if (rawTag.isEmpty()) {
            continue;
          }
          String normalizedTag = rawTag.toLowerCase();
          if (!uniqueByNormalizedName.containsKey(normalizedTag)) {
            uniqueByNormalizedName.put(normalizedTag, rawTag);
          }
        }
      }

      if (uniqueByNormalizedName.isEmpty()) {
        transactionTagsByTransactionId.put(transactionId, new java.util.ArrayList<>());
        JSObject result = new JSObject();
        result.put("status", "none");
        call.resolve(result);
        return;
      }

      org.json.JSONArray resolvedTagIds = new org.json.JSONArray();
      java.util.List<String> storedTagIds = new java.util.ArrayList<>();
      for (java.util.Map.Entry<String, String> entry : uniqueByNormalizedName.entrySet()) {
        String normalizedTagName = entry.getKey();
        String rawTagName = entry.getValue();

        JSObject existingTag = null;
        for (JSObject tag : taxonomyTags) {
          if (normalizedTagName.equals(tag.getString("normalizedName", ""))) {
            existingTag = tag;
            break;
          }
        }

        if (existingTag != null) {
          String tagStatus = existingTag.getString("status", "active");
          if (!"active".equalsIgnoreCase(tagStatus)) {
            JSObject failed = new JSObject();
            failed.put("status", "failed");
            failed.put("errorCode", "TAG_ARCHIVED");
            failed.put("errorMessage", "Tag is archived: " + existingTag.getString("name"));
            call.resolve(failed);
            return;
          }

          String existingTagId = existingTag.getString("id");
          resolvedTagIds.put(existingTagId);
          storedTagIds.add(existingTagId);
          continue;
        }

        JSObject createdTag = new JSObject();
        String createdTagId = java.util.UUID.randomUUID().toString();
        createdTag.put("id", createdTagId);
        createdTag.put("name", rawTagName);
        createdTag.put("normalizedName", normalizedTagName);
        createdTag.put("status", "active");
        taxonomyTags.add(createdTag);

        resolvedTagIds.put(createdTagId);
        storedTagIds.add(createdTagId);
      }

      transactionTagsByTransactionId.put(transactionId, storedTagIds);
      JSObject result = new JSObject();
      result.put("status", "assigned");
      result.put("tagIds", resolvedTagIds);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }
}
