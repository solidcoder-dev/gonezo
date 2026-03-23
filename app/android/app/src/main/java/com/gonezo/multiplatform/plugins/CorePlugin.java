package com.gonezo.multiplatform.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
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
    String defaultAccountType = policy.getString("defaultAccountType", "cash");
    String duplicatePolicy = normalizeDuplicatePolicy(policy.getString("duplicatePolicy", "skip"));

    try {
      byte[] bytes = Base64.getDecoder().decode(fileBase64);
      String decodedText = decodeMobillsText(bytes);
      JSObject result = importMobillsText(
        decodedText,
        createMissingAccounts,
        createMissingCategories,
        createMissingTags,
        defaultAccountType,
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

  private JSObject importMobillsText(
    String content,
    boolean createMissingAccounts,
    boolean createMissingCategories,
    boolean createMissingTags,
    String defaultAccountType,
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
        AndroidLedgerCore.LedgerAccountView account = findAccount(cachedAccounts, accountName, currency);
        if (account == null) {
          if (!createMissingAccounts) {
            throw new IllegalStateException("ACCOUNT_NOT_FOUND:" + accountName + ":" + currency);
          }
          String createdAccountId = ledgerCore.openAccount(accountName, defaultAccountType, currency, null, null).toString();
          cachedAccounts = new ArrayList<>(ledgerCore.listAccounts());
          account = findAccountById(cachedAccounts, createdAccountId);
        }
        if (account == null) {
          throw new IllegalStateException("Account not found: " + accountName);
        }

        boolean expense = value.compareTo(BigDecimal.ZERO) < 0;
        String amount = value.abs().toPlainString();
        String transactionType = expense ? "expense" : "income";
        String transactionId = expense
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

    if (uniqueByNormalizedName.isEmpty()) {
      transactionTagsByTransactionId.put(transactionId, new ArrayList<>());
      JSObject result = new JSObject();
      result.put("status", "none");
      return result;
    }

    JSONArray resolvedTagIds = new JSONArray();
    List<String> storedTagIds = new ArrayList<>();
    for (Map.Entry<String, String> entry : uniqueByNormalizedName.entrySet()) {
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
          return failed;
        }

        String existingTagId = existingTag.getString("id");
        resolvedTagIds.put(existingTagId);
        storedTagIds.add(existingTagId);
        continue;
      }

      JSObject createdTag = new JSObject();
      String createdTagId = UUID.randomUUID().toString();
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
}
