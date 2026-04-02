package com.gonezo.multiplatform.plugins;

import android.Manifest;
import android.media.MediaRecorder;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.gonezo.audioextraction.domain.contract.ContractJsonMapper;
import com.gonezo.audioextraction.infrastructure.llm.LlmConfig;
import com.gonezo.audioextraction.ui.AudioExtractionFacade;
import com.gonezo.audioextraction.ui.config.AudioExtractionWiring;
import com.gonezo.audioextraction.ui.dto.ExtractionResultDto;
import com.gonezo.multiplatform.audioextraction.infrastructure.asr.VoskTranscriptionEngine;
import com.gonezo.multiplatform.audioextraction.infrastructure.source.LoopbackHttpsSourceLoader;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import com.gonezo.multiplatform.plugins.voice.VoiceExtractionRequestBuilder;
import com.gonezo.multiplatform.plugins.voice.VoiceExtractionRequestFactory;
import com.gonezo.multiplatform.storage.AndroidObjectStorage;
import com.gonezo.multiplatform.storage.ObjectStorage;
import com.gonezo.multiplatform.storage.SignedAccessLink;
import com.gonezo.multiplatform.storage.StorageMetadata;
import com.gonezo.multiplatform.storage.StorageRef;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
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
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(
  name = "CorePlugin",
  permissions = {
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
  }
)
public class CorePlugin extends Plugin {
  private static final String VOICE_LOG_TAG = "GonezoVoiceFlow";
  private final java.util.List<JSObject> taxonomyTags = new java.util.ArrayList<>();
  private final java.util.Map<String, String> transactionCategoryByTransactionId = new java.util.HashMap<>();
  private final java.util.Map<String, java.util.List<String>> transactionTagsByTransactionId = new java.util.HashMap<>();
  private final java.util.Map<String, JSObject> transactionVoiceSessionById = new ConcurrentHashMap<>();
  private final java.util.Map<String, MediaRecorder> transactionVoiceRecorderBySessionId = new ConcurrentHashMap<>();
  private final java.util.Map<String, JSObject> transactionVoiceAnalysisById = new ConcurrentHashMap<>();
  private AudioExtractionFacade audioExtractionFacade;
  private VoiceExtractionRequestBuilder voiceExtractionRequestBuilder;
  private ObjectStorage objectStorage;

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
      for (AndroidLedgerCore.LedgerTransactionView transaction : existingTransactions) {
        transactionCategoryByTransactionId.remove(transaction.id());
        transactionTagsByTransactionId.remove(transaction.id());
      }
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

      List<AndroidLedgerCore.LedgerTransactionView> filteredTransactions = new ArrayList<>();
      for (AndroidLedgerCore.LedgerTransactionView tx : allTransactions) {
        String resolvedCategoryId = transactionCategoryByTransactionId.get(tx.id());
        if (resolvedCategoryId == null || resolvedCategoryId.trim().isEmpty()) {
          resolvedCategoryId = tx.categoryId();
        }

        if (categoryFilter != null && (resolvedCategoryId == null || !categoryFilter.contains(resolvedCategoryId))) {
          continue;
        }

        if (tagFilter != null) {
          List<String> assignedTagIds = transactionTagsByTransactionId.get(tx.id());
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
        String categoryIdValue = transactionCategoryByTransactionId.get(tx.id());
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
      if ("assigned".equalsIgnoreCase(categorization.status()) && categorization.categoryId() != null) {
        transactionCategoryByTransactionId.put(transactionId, categorization.categoryId());
      } else if ("none".equalsIgnoreCase(categorization.status())) {
        transactionCategoryByTransactionId.remove(transactionId);
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
      if (transactionIds != null) {
        for (int index = 0; index < transactionIds.length(); index++) {
          String transactionId = transactionIds.optString(index, "").trim();
          if (transactionId.isEmpty()) {
            continue;
          }
          JSObject item = new JSObject();
          item.put("transactionId", transactionId);

          String categoryId = transactionCategoryByTransactionId.get(transactionId);
          if (categoryId != null && !categoryId.trim().isEmpty()) {
            item.put("categoryId", categoryId);
            item.put("categorizationStatus", "assigned");
          } else {
            item.put("categorizationStatus", "none");
          }

          JSONArray tagIds = new JSONArray();
          List<String> tags = transactionTagsByTransactionId.get(transactionId);
          if (tags != null) {
            for (String tagId : tags) {
              tagIds.put(tagId);
            }
          }
          item.put("tagIds", tagIds);
          item.put("taggingStatus", tagIds.length() > 0 ? "assigned" : "none");
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
  public void transactionVoiceStart(PluginCall call) {
    if (getPermissionState("microphone") != PermissionState.GRANTED) {
      requestPermissionForAlias("microphone", call, "transactionVoiceStartPermissionCallback");
      return;
    }
    startTransactionVoiceSession(call);
  }

  @PermissionCallback
  private void transactionVoiceStartPermissionCallback(PluginCall call) {
    if (getPermissionState("microphone") != PermissionState.GRANTED) {
      call.reject("Microphone permission denied");
      return;
    }
    startTransactionVoiceSession(call);
  }

  private void startTransactionVoiceSession(PluginCall call) {
    String accountId = call.getString("accountId");
    String expectedType = call.getString("expectedType");
    if (accountId == null || accountId.trim().isEmpty()) {
      call.reject("accountId is required");
      return;
    }
    if (expectedType == null || expectedType.trim().isEmpty()) {
      call.reject("expectedType is required");
      return;
    }

    String normalizedType = expectedType.trim().toLowerCase(Locale.ROOT);
    if (!isSupportedVoiceType(normalizedType)) {
      call.reject("expectedType must be expense, income or transfer");
      return;
    }

    String sessionId = UUID.randomUUID().toString();
    String recordingId = UUID.randomUUID().toString();
    String startedAt = Instant.now().toString();
    String storageNamespace = "voice-recordings";
    String storagePath = recordingId + ".m4a";
    String recordingPath = "storage://" + storageNamespace + "/" + storagePath;
    File recordingFile = resolveVoiceRecordingFile(recordingId);
    logi("voice_start_requested sessionId=" + sessionId
        + " expectedType=" + normalizedType
        + " recordingPath=" + recordingPath
    );

    JSObject session = new JSObject();
    session.put("sessionId", sessionId);
    session.put("accountId", accountId.trim());
    session.put("expectedType", normalizedType);
    session.put("recordingId", recordingId);
    session.put("recordingPath", recordingPath);
    session.put("recordingFilePath", recordingFile.getAbsolutePath());
    session.put("storageNamespace", storageNamespace);
    session.put("storagePath", storagePath);
    session.put("startedAt", startedAt);
    try {
      MediaRecorder recorder = new MediaRecorder();
      recorder.setAudioSource(MediaRecorder.AudioSource.MIC);
      recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
      recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC);
      recorder.setAudioSamplingRate(44100);
      recorder.setAudioEncodingBitRate(128000);
      recorder.setOutputFile(recordingFile.getAbsolutePath());
      recorder.prepare();
      recorder.start();

      transactionVoiceSessionById.put(sessionId, session);
      transactionVoiceRecorderBySessionId.put(sessionId, recorder);
      logi("voice_start_ok sessionId=" + sessionId
          + " recordingFileExists=" + recordingFile.exists()
          + " recordingFileSize=" + recordingFile.length()
      );

      JSObject result = new JSObject();
      result.put("sessionId", sessionId);
      result.put("recordingId", recordingId);
      result.put("recordingPath", recordingPath);
      result.put("startedAt", startedAt);
      call.resolve(result);
    } catch (IOException | RuntimeException ex) {
      cleanupVoiceSessionResources(sessionId, false);
      if (recordingFile.exists()) {
        //noinspection ResultOfMethodCallIgnored
        recordingFile.delete();
      }
      loge("voice_start_failed sessionId=" + sessionId + " reason=" + ex.getClass().getSimpleName(),
        ex
      );
      call.reject("Failed to start voice recording: " + ex.getMessage());
    }
  }

  @PluginMethod
  public void transactionVoiceStop(PluginCall call) {
    String sessionId = call.getString("sessionId");
    if (sessionId == null || sessionId.trim().isEmpty()) {
      call.reject("sessionId is required");
      return;
    }

    JSObject session = transactionVoiceSessionById.get(sessionId.trim());
    if (session == null) {
      call.reject("Voice session not found: " + sessionId);
      return;
    }

    String normalizedSessionId = sessionId.trim();
    String manualTranscript = nullIfBlank(call.getString("transcript"));
    if (manualTranscript != null) {
      session.put("transcript", manualTranscript);
    }
    logi("voice_stop_requested sessionId=" + normalizedSessionId
        + " hasManualTranscript=" + (manualTranscript != null)
        + " manualTranscriptLength=" + safeLength(manualTranscript)
    );

    MediaRecorder recorder = transactionVoiceRecorderBySessionId.remove(normalizedSessionId);
    RuntimeException stopRecordingException = null;
    if (recorder != null) {
      try {
        recorder.stop();
      } catch (RuntimeException ex) {
        stopRecordingException = ex;
      } finally {
        recorder.reset();
        recorder.release();
      }
    }
    if (stopRecordingException != null) {
      logw("voice_stop_recorder_error sessionId=" + normalizedSessionId + " reason=" + stopRecordingException.getMessage()
      );
    }

    String stoppedAt = Instant.now().toString();
    String startedAt = session.getString("startedAt", stoppedAt);
    long durationMs = 0L;
    try {
      durationMs = Math.max(0L, Instant.parse(stoppedAt).toEpochMilli() - Instant.parse(startedAt).toEpochMilli());
    } catch (DateTimeParseException ignored) {
      durationMs = 0L;
    }

    if (stopRecordingException != null) {
      File recordingFile = new File(session.getString("recordingFilePath", ""));
      if (recordingFile.exists()) {
        //noinspection ResultOfMethodCallIgnored
        recordingFile.delete();
      }
    } else {
      try {
        String storageNamespace = session.getString("storageNamespace", "").trim();
        String storagePath = session.getString("storagePath", "").trim();
        StorageRef storageRef = new StorageRef(storageNamespace, storagePath);
        File recordingFile = new File(session.getString("recordingFilePath", ""));
        byte[] bytes = Files.readAllBytes(recordingFile.toPath());
        objectStorage().put(
          storageRef,
          bytes,
          new StorageMetadata("audio/mp4", storagePath, stoppedAt)
        );
        if (recordingFile.exists()) {
          //noinspection ResultOfMethodCallIgnored
          recordingFile.delete();
        }
        logi("voice_storage_put_ok sessionId=" + normalizedSessionId
            + " namespace=" + storageNamespace
            + " path=" + storagePath
            + " bytes=" + bytes.length
        );
      } catch (Exception ex) {
        loge("voice_storage_put_failed sessionId=" + normalizedSessionId, ex);
        call.reject("Failed to persist voice recording");
        return;
      }
    }

    session.put("stoppedAt", stoppedAt);
    session.put("durationMs", durationMs);

    JSObject result = new JSObject();
    result.put("sessionId", normalizedSessionId);
    result.put("recordingId", session.getString("recordingId"));
    result.put("recordingPath", session.getString("recordingPath"));
    result.put("stoppedAt", stoppedAt);
    result.put("durationMs", durationMs);
    result.put("transcript", session.getString("transcript", ""));
    logi("voice_stop_ok sessionId=" + normalizedSessionId
        + " durationMs=" + durationMs
        + " transcriptLength=" + safeLength(session.getString("transcript", ""))
    );
    call.resolve(result);
  }

  @PluginMethod
  public void transactionVoiceExtractDraft(PluginCall call) {
    String sessionId = call.getString("sessionId");
    if (sessionId == null || sessionId.trim().isEmpty()) {
      call.reject("sessionId is required");
      return;
    }

    JSObject session = transactionVoiceSessionById.get(sessionId.trim());
    if (session == null) {
      call.reject("Voice session not found: " + sessionId);
      return;
    }

    String stoppedAt = session.getString("stoppedAt");
    if (stoppedAt == null || stoppedAt.trim().isEmpty()) {
      call.reject("Voice session must be stopped before extraction");
      return;
    }

    String expectedType = session.getString("expectedType", "").trim().toLowerCase(Locale.ROOT);
    if (!isSupportedVoiceType(expectedType)) {
      call.reject("Voice session has invalid expectedType");
      return;
    }

    String analysisId = UUID.randomUUID().toString();
    String createdAt = Instant.now().toString();
    String recordingId = session.getString("recordingId");
    String recordingPath = session.getString("recordingPath");
    String storageNamespace = session.getString("storageNamespace", "").trim();
    String storagePath = session.getString("storagePath", "").trim();
    String accountId = session.getString("accountId");
    String transcript = session.getString("transcript", "");
    if (storageNamespace.isEmpty() || storagePath.isEmpty()) {
      call.reject("Voice session storage ref is missing");
      return;
    }

    SignedAccessLink signedAccessLink;
    try {
      signedAccessLink = objectStorage().getSignedAccess(new StorageRef(storageNamespace, storagePath), 120L);
    } catch (Exception ex) {
      loge("voice_storage_signed_url_failed sessionId=" + sessionId.trim(), ex);
      call.reject("Cannot generate signed URL for voice recording");
      return;
    }

    logi("voice_extract_requested sessionId=" + sessionId.trim()
        + " analysisId=" + analysisId
        + " transcriptLength=" + safeLength(transcript)
        + " storageRef=" + storageNamespace + "/" + storagePath
        + " accessExpiresAt=" + signedAccessLink.expiresAt()
        + " recordingPath=" + recordingPath
    );

    AndroidLedgerCore ledgerCore = AndroidLedgerCore.getInstance(getContext());
    ExtractionResultDto extractionResult;
    try {
      extractionResult = audioExtractionFacade().execute(
        voiceExtractionRequestBuilder().build(
          signedAccessLink.url(),
          loadTransactionOutputSchemaMap(),
          accountId,
          expectedType,
          transcript
        )
      );
    } catch (IllegalArgumentException ex) {
      logw("voice_extract_invalid_request sessionId=" + sessionId.trim()
          + " analysisId=" + analysisId
          + " reason=" + ex.getMessage()
      );
      call.reject(ex.getMessage());
      return;
    }
    logi("voice_extract_result sessionId=" + sessionId.trim()
        + " analysisId=" + analysisId
        + " outcome=" + extractionResult.getOutcome()
        + " issues=" + summarizeIssues(extractionResult.getGlobalIssues())
        + " stageTimings=" + summarizeStageTimings(extractionResult)
    );
    if ("failed".equalsIgnoreCase(extractionResult.getOutcome())) {
      String issues = extractionResult.getGlobalIssues() == null || extractionResult.getGlobalIssues().isEmpty()
        ? "unknown"
        : String.join(",", extractionResult.getGlobalIssues());
      logw("voice_extract_failed sessionId=" + sessionId.trim()
          + " analysisId=" + analysisId
          + " issues=" + issues
          + " transcriptLength=" + safeLength(transcript)
      );
      call.reject("Voice extraction failed: " + issues);
      return;
    }
    JSObject draft = mapExtractionResultToDraft(extractionResult, expectedType, stoppedAt, transcript);

    JSObject recording = new JSObject();
    recording.put("id", recordingId);
    recording.put("path", recordingPath);
    recording.put("createdAt", session.getString("startedAt", createdAt));

    JSObject analysis = new JSObject();
    analysis.put("analysisId", analysisId);
    analysis.put("sessionId", sessionId.trim());
    analysis.put("accountId", accountId);
    analysis.put("expectedType", expectedType);
    analysis.put("recording", recording);
    analysis.put("draft", draft);
    analysis.put("createdAt", createdAt);

    try {
      ledgerCore.recordTransactionVoiceCapture(
        analysisId,
        recordingId,
        recordingPath,
        accountId,
        expectedType,
        draft.toString(),
        createdAt
      );
      transactionVoiceAnalysisById.put(analysisId, analysis);
      transactionVoiceSessionById.remove(sessionId.trim());

      JSObject result = new JSObject();
      result.put("analysisId", analysisId);
      result.put("sessionId", sessionId.trim());
      result.put("recording", recording);
      result.put("draft", draft);
      logi("voice_extract_ok sessionId=" + sessionId.trim()
          + " analysisId=" + analysisId
          + " draftFields=" + draft.keys().hasNext()
      );
      call.resolve(result);
    } catch (Exception ex) {
      loge("voice_extract_persist_failed sessionId=" + sessionId.trim() + " analysisId=" + analysisId,
        ex
      );
      call.reject(ex.getMessage());
    }
  }

  private AudioExtractionFacade audioExtractionFacade() {
    if (audioExtractionFacade == null) {
      audioExtractionFacade = AudioExtractionWiring.INSTANCE.createFacade(
        60_000L,
        new LlmConfig(2048, 8000, 5_000L),
        new LoopbackHttpsSourceLoader(getContext()),
        new VoskTranscriptionEngine(getContext())
      );
    }
    return audioExtractionFacade;
  }

  private VoiceExtractionRequestBuilder voiceExtractionRequestBuilder() {
    if (voiceExtractionRequestBuilder == null) {
      voiceExtractionRequestBuilder = new VoiceExtractionRequestFactory();
    }
    return voiceExtractionRequestBuilder;
  }

  private ObjectStorage objectStorage() {
    if (objectStorage == null) {
      objectStorage = new AndroidObjectStorage(getContext());
    }
    return objectStorage;
  }

  private JSObject mapExtractionResultToDraft(
    ExtractionResultDto extractionResult,
    String expectedType,
    String defaultOccurredAt,
    String transcript
  ) {
    JSObject draft = new JSObject();

    String type = asText(resolveExtractionValue(extractionResult, "type"));
    if (!isSupportedVoiceType(type)) {
      type = expectedType;
    }

    String amount = toAmountString(resolveExtractionValue(extractionResult, "amount"));
    String occurredAt = asText(resolveExtractionValue(extractionResult, "occurredAt"));
    String note = asText(resolveExtractionValue(extractionResult, "note"));
    String transcriptFallback = nullIfBlank(transcript);
    if (transcriptFallback == null) {
      transcriptFallback = asText(extractionResult == null ? null : extractionResult.getTranscript());
    }

    draft.put("type", type);
    if (amount != null) {
      draft.put("amount", amount);
    }
    draft.put("occurredAt", occurredAt == null ? defaultOccurredAt : occurredAt);
    draft.put("note", note == null ? (transcriptFallback == null ? "" : transcriptFallback) : note);

    String transferToAccountId = asText(resolveExtractionValue(extractionResult, "transferToAccountId"));
    if (transferToAccountId != null && !transferToAccountId.isBlank()) {
      draft.put("transferToAccountId", transferToAccountId);
    }

    String categoryName = asText(resolveExtractionValue(extractionResult, "categoryName"));
    if (categoryName != null && !categoryName.isBlank()) {
      draft.put("categoryName", categoryName);
    }

    JSONArray tagNames = toTagNames(resolveExtractionValue(extractionResult, "tagNames"));
    if (tagNames.length() > 0) {
      draft.put("tagNames", tagNames);
    }

    return draft;
  }

  private Object resolveExtractionValue(ExtractionResultDto extractionResult, String fieldName) {
    if (extractionResult == null) {
      return null;
    }

    if (extractionResult.getData().containsKey(fieldName)) {
      return extractionResult.getData().get(fieldName);
    }

    ExtractionResultDto.FieldResultDto fieldResult = extractionResult.getFieldResults().get(fieldName);
    return fieldResult == null ? null : fieldResult.getValue();
  }

  private String asText(Object value) {
    if (value == null) {
      return null;
    }
    String text = String.valueOf(value).trim();
    return text.isEmpty() ? null : text;
  }

  private String toAmountString(Object value) {
    if (value == null) {
      return null;
    }
    try {
      BigDecimal parsed = value instanceof Number numberValue
        ? new BigDecimal(numberValue.toString())
        : new BigDecimal(String.valueOf(value).trim().replace(",", "."));
      return parsed.abs().toPlainString();
    } catch (NumberFormatException ex) {
      return null;
    }
  }

  private JSONArray toTagNames(Object value) {
    JSONArray tags = new JSONArray();
    if (value == null) {
      return tags;
    }

    if (value instanceof List<?> listValue) {
      for (Object listItem : listValue) {
        String tag = asText(listItem);
        if (tag != null) {
          tags.put(tag);
        }
      }
      return tags;
    }

    String raw = asText(value);
    if (raw == null) {
      return tags;
    }

    for (String chunk : raw.split("[,;|]")) {
      String normalized = chunk.trim();
      if (!normalized.isEmpty()) {
        tags.put(normalized);
      }
    }
    return tags;
  }

  private void cleanupVoiceSessionResources(String sessionId, boolean removeSession) {
    MediaRecorder recorder = transactionVoiceRecorderBySessionId.remove(sessionId);
    if (recorder != null) {
      try {
        recorder.reset();
      } catch (RuntimeException ignored) {
        // no-op
      }
      recorder.release();
    }

    if (removeSession) {
      transactionVoiceSessionById.remove(sessionId);
    }
  }

  private int safeLength(String value) {
    return value == null ? 0 : value.length();
  }

  private String summarizeIssues(List<String> issues) {
    if (issues == null || issues.isEmpty()) {
      return "none";
    }
    return String.join("|", issues);
  }

  private String summarizeStageTimings(ExtractionResultDto extractionResult) {
    if (extractionResult == null || extractionResult.getProcessingInfo() == null || extractionResult.getProcessingInfo().getStageTimings().isEmpty()) {
      return "none";
    }
    StringBuilder builder = new StringBuilder();
    for (Map.Entry<String, Double> entry : extractionResult.getProcessingInfo().getStageTimings().entrySet()) {
      if (builder.length() > 0) {
        builder.append(',');
      }
      builder.append(entry.getKey()).append('=').append(String.format(Locale.ROOT, "%.0f", entry.getValue()));
    }
    return builder.toString();
  }

  private Map<String, Object> loadTransactionOutputSchemaMap() {
    try (BufferedReader reader = new BufferedReader(new InputStreamReader(
      getContext().getAssets().open("audio-extraction/schemas/transaction-output.v1.schema.json"),
      StandardCharsets.UTF_8
    ))) {
      StringBuilder content = new StringBuilder();
      String line;
      while ((line = reader.readLine()) != null) {
        content.append(line).append('\n');
      }
      return ContractJsonMapper.toMap(new JSONObject(content.toString()));
    } catch (IOException | JSONException ex) {
      throw new IllegalStateException("Cannot load transaction output schema", ex);
    }
  }

  private void logd(String message) {
    try {
      Log.d(VOICE_LOG_TAG, message);
    } catch (RuntimeException ignored) {
      // Running under local unit tests without android logger.
    }
  }

  private void logi(String message) {
    try {
      Log.i(VOICE_LOG_TAG, message);
    } catch (RuntimeException ignored) {
      // Running under local unit tests without android logger.
    }
  }

  private void logw(String message) {
    try {
      Log.w(VOICE_LOG_TAG, message);
    } catch (RuntimeException ignored) {
      // Running under local unit tests without android logger.
    }
  }

  private void logw(String message, Throwable error) {
    try {
      Log.w(VOICE_LOG_TAG, message, error);
    } catch (RuntimeException ignored) {
      // Running under local unit tests without android logger.
    }
  }

  private void loge(String message, Throwable error) {
    try {
      Log.e(VOICE_LOG_TAG, message, error);
    } catch (RuntimeException ignored) {
      // Running under local unit tests without android logger.
    }
  }

  private File resolveVoiceRecordingFile(String recordingId) {
    File recordingsDir = new File(getContext().getFilesDir(), "voice-recordings");
    if (!recordingsDir.exists() && !recordingsDir.mkdirs()) {
      throw new IllegalStateException("Cannot create voice recording directory");
    }
    return new File(recordingsDir, recordingId + ".m4a");
  }

  @PluginMethod
  public void transactionVoiceFinalize(PluginCall call) {
    String analysisId = call.getString("analysisId");
    if (analysisId == null || analysisId.trim().isEmpty()) {
      call.reject("analysisId is required");
      return;
    }

    try {
      AndroidLedgerCore core = AndroidLedgerCore.getInstance(getContext());
      if (!core.hasTransactionVoiceCapture(analysisId)) {
        call.reject("Voice analysis not found: " + analysisId);
        return;
      }

      JSObject existing = transactionVoiceAnalysisById.get(analysisId);
      String outcome = call.getString("outcome", "saved");
      String finalizedAt = Instant.now().toString();
      JSONArray transactionIds = call.getArray("transactionIds");
      JSObject finalDraft = call.getObject("finalDraft");
      String errorMessage = call.getString("errorMessage");

      core.finalizeTransactionVoiceCapture(
        analysisId,
        outcome,
        transactionIds == null ? null : transactionIds.toString(),
        finalDraft == null ? null : finalDraft.toString(),
        errorMessage,
        finalizedAt
      );

      if (existing != null) {
        existing.put("outcome", outcome);
        existing.put("finalizedAt", finalizedAt);
        if (finalDraft != null) {
          existing.put("finalDraft", finalDraft);
        }
        if (transactionIds != null) {
          existing.put("transactionIds", transactionIds);
        }
        if (errorMessage != null && !errorMessage.trim().isEmpty()) {
          existing.put("errorMessage", errorMessage);
        }
      }

      JSObject result = new JSObject();
      result.put("analysisId", analysisId);
      result.put("finalizedAt", finalizedAt);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
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
            if ("assigned".equalsIgnoreCase(categorization.status()) && categorization.categoryId() != null) {
              transactionCategoryByTransactionId.put(transactionId, categorization.categoryId());
            } else if ("none".equalsIgnoreCase(categorization.status())) {
              transactionCategoryByTransactionId.remove(transactionId);
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

  private boolean isSupportedVoiceType(String voiceType) {
    return "expense".equals(voiceType) || "income".equals(voiceType) || "transfer".equals(voiceType);
  }

  private record TransferDescriptor(
    String outAccountName,
    String inAccountName
  ) {}
}
