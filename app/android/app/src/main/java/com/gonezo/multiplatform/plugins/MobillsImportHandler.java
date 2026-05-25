package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
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
import org.json.JSONArray;
import org.json.JSONException;

final class MobillsImportHandler {
  private final Context context;

  MobillsImportHandler(Context context) {
    this.context = context;
  }

  JSObject importBase64(String fileBase64, JSObject rawPolicy) throws JSONException {
    JSObject policy = rawPolicy == null ? new JSObject() : rawPolicy;
    Boolean createMissingAccountsValue = policy.getBool("createMissingAccounts");
    Boolean createMissingCategoriesValue = policy.getBool("createMissingCategories");
    Boolean createMissingTagsValue = policy.getBool("createMissingTags");
    boolean createMissingAccounts = createMissingAccountsValue != null && createMissingAccountsValue;
    boolean createMissingCategories = createMissingCategoriesValue == null || createMissingCategoriesValue;
    boolean createMissingTags = createMissingTagsValue == null || createMissingTagsValue;
    String duplicatePolicy = normalizeDuplicatePolicy(policy.getString("duplicatePolicy", "skip"));

    byte[] bytes = Base64.getDecoder().decode(fileBase64);
    String decodedText = decodeMobillsText(bytes);
    return importMobillsText(
      decodedText,
      createMissingAccounts,
      createMissingCategories,
      createMissingTags,
      duplicatePolicy
    );
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

    AndroidLedgerCore ledgerCore = AndroidLedgerCore.getInstance(context);
    AndroidTaxonomyCore taxonomyCore = AndroidTaxonomyCore.getInstance(context);
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
            JSObject outTagging = TransactionTaggingBridge.applyTagsToTransaction(
              context,
              transferResult.transferOutId(),
              tags
            );
            if ("failed".equalsIgnoreCase(outTagging.getString("status"))) {
              String code = outTagging.getString("errorCode");
              String message = outTagging.getString("errorMessage");
              throw new IllegalStateException(code != null ? code : message);
            }
            JSObject inTagging = TransactionTaggingBridge.applyTagsToTransaction(
              context,
              transferResult.transferInId(),
              tags
            );
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
          }

          if (!tagNames.isEmpty()) {
            if (!createMissingTags) {
              throw new IllegalStateException("TAG_AUTOCREATE_DISABLED");
            }
            JSONArray tags = new JSONArray();
            for (String tagName : tagNames) {
              tags.put(tagName);
            }
            JSObject tagging = TransactionTaggingBridge.applyTagsToTransaction(context, transactionId, tags);
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

  private record TransferDescriptor(
    String outAccountName,
    String inAccountName
  ) {}
}
