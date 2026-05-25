package com.gonezo.multiplatform.plugins;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import com.getcapacitor.JSObject;
import com.gonezo.application.orchestration.backup.ImportMovementsBackupResult;
import com.gonezo.application.orchestration.backup.ImportMovementsBackupRowResult;
import com.gonezo.multiplatform.core.AndroidMovementsBackupCore;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class MovementsBackupHandler {
  private final Context context;

  MovementsBackupHandler(Context context) {
    this.context = context;
  }

  JSObject exportBackup() throws Exception {
    MovementsBackupExport export = buildMovementsBackupExport();
    String json = toJson(export);
    String fileName = backupFileName(export.exportedAt());
    String savedTo = writeBackupFile(fileName, json);

    JSObject result = new JSObject();
    result.put("fileName", fileName);
    result.put("exportedAt", export.exportedAt());
    result.put("savedTo", savedTo);
    result.put("postedMovementCount", export.postedMovements().size());
    result.put("accountCount", export.accounts().size());
    result.put("categoryCount", export.categories().size());
    result.put("tagCount", export.tags().size());
    return result;
  }

  JSObject importBase64(String fileBase64) throws Exception {
    byte[] bytes = Base64.getDecoder().decode(fileBase64);
    ImportMovementsBackupResult importResult = AndroidMovementsBackupCore.getInstance(context).importBackup(bytes);
    return toJson(importResult);
  }

  static JSObject toJson(ImportMovementsBackupResult importResult) throws JSONException {
    JSObject result = new JSObject();
    result.put("totalRows", importResult.getTotalRows());
    result.put("importedCount", importResult.getImportedCount());
    result.put("failedCount", importResult.getFailedCount());
    result.put("skippedCount", importResult.getSkippedCount());

    JSONArray rows = new JSONArray();
    for (ImportMovementsBackupRowResult row : importResult.getRows()) {
      JSObject item = new JSObject();
      item.put("sourceLine", row.getSourceLine());
      item.put("status", row.getStatus().name().toLowerCase(Locale.ROOT));
      if (row.getTransactionId() != null) {
        item.put("transactionId", row.getTransactionId().toString());
      }
      if (row.getErrorCode() != null) {
        item.put("errorCode", row.getErrorCode());
      }
      if (row.getErrorMessage() != null) {
        item.put("errorMessage", row.getErrorMessage());
      }
      rows.put(item);
    }
    result.put("rows", rows);
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

  private MovementsBackupExport buildMovementsBackupExport() {
    AndroidLedgerCore ledgerCore = AndroidLedgerCore.getInstance(context);
    AndroidTaxonomyCore taxonomyCore = AndroidTaxonomyCore.getInstance(context);
    String exportedAt = Instant.now().toString();

    List<AndroidLedgerCore.LedgerAccountView> accounts = ledgerCore.listAccounts();
    List<AndroidTaxonomyCore.TaxonomyCategoryView> categories = taxonomyCore.listCategories(null, true);
    List<AndroidTaxonomyCore.TaxonomyTagView> tags = taxonomyCore.listTags(true);

    List<AndroidLedgerCore.LedgerTransactionView> allTransactions = new ArrayList<>();
    for (AndroidLedgerCore.LedgerAccountView account : accounts) {
      allTransactions.addAll(
        listAllTransactions(
          ledgerCore,
          account.id(),
          new AndroidLedgerCore.LedgerTransactionFilterInput(
            null,
            null,
            null,
            null,
            null,
            List.of("posted"),
            null
          ),
          List.of(new AndroidLedgerCore.LedgerTransactionSortInput("occurredAt", "desc"))
        )
      );
    }

    List<String> transactionIds = allTransactions.stream().map(AndroidLedgerCore.LedgerTransactionView::id).toList();
    Map<String, AndroidTaxonomyCore.TransactionTaxonomyView> taxonomyByTransactionId =
      taxonomyCore.listTransactionTaxonomy(transactionIds);

    List<MovementsBackupPostedMovement> postedMovements = new ArrayList<>();
    for (AndroidLedgerCore.LedgerTransactionView tx : allTransactions) {
      postedMovements.add(
        new MovementsBackupPostedMovement(
          tx.id(),
          tx.accountId(),
          tx.type(),
          tx.status(),
          tx.occurredAt(),
          tx.amount(),
          tx.currency(),
          tx.description(),
          tx.merchant(),
          tx.categoryId(),
          tx.linkedTransactionId(),
          tx.items().stream()
            .map((item) -> new MovementsBackupSplitItem(
              item.id(),
              item.name(),
              item.amount(),
              item.currency(),
              item.categoryId(),
              item.note()
            ))
            .toList(),
          taxonomyByTransactionId.get(tx.id())
        )
      );
    }

    return new MovementsBackupExport(exportedAt, accounts, categories, tags, postedMovements);
  }

  private String toJson(MovementsBackupExport export) throws JSONException {
    JSONObject root = new JSONObject();
    root.put("schemaVersion", 2);
    root.put("exportedAt", export.exportedAt());

    Map<String, String> categoryNameById = new LinkedHashMap<>();

    JSONArray accounts = new JSONArray();
    for (AndroidLedgerCore.LedgerAccountView account : export.accounts()) {
      JSONObject item = new JSONObject();
      item.put("id", account.id());
      item.put("name", account.name());
      item.put("type", account.type());
      item.put("currency", account.currency());
      item.put("status", account.status());
      accounts.put(item);
    }
    root.put("accounts", accounts);

    JSONArray categories = new JSONArray();
    for (AndroidTaxonomyCore.TaxonomyCategoryView category : export.categories()) {
      JSONObject item = new JSONObject();
      item.put("id", category.id());
      item.put("name", category.name());
      item.put("appliesTo", category.appliesTo());
      item.put("status", category.status());
      categories.put(item);
      categoryNameById.put(category.id(), category.name());
    }
    root.put("categories", categories);

    JSONArray tags = new JSONArray();
    for (AndroidTaxonomyCore.TaxonomyTagView tag : export.tags()) {
      JSONObject item = new JSONObject();
      item.put("id", tag.id());
      item.put("name", tag.name());
      item.put("status", tag.status());
      tags.put(item);
    }
    root.put("tags", tags);

    JSONArray movements = new JSONArray();
    for (MovementsBackupPostedMovement movement : export.postedMovements()) {
      JSONObject item = new JSONObject();
      item.put("id", movement.id());
      item.put("accountId", movement.accountId());
      item.put("type", movement.type());
      item.put("status", movement.status());
      item.put("occurredAt", movement.occurredAt());
      item.put("amount", movement.amount());
      item.put("currency", movement.currency());
      item.put("description", movement.description());
      item.put("merchant", movement.merchant());
      item.put("categoryId", movement.categoryId());
      item.put("linkedTransactionId", movement.linkedTransactionId());

      JSONArray splitItems = new JSONArray();
      for (MovementsBackupSplitItem splitItem : movement.splitItems()) {
        JSONObject split = new JSONObject();
        split.put("id", splitItem.id());
        split.put("name", splitItem.name());
        split.put("amount", splitItem.amount());
        split.put("currency", splitItem.currency());
        split.put("categoryId", splitItem.categoryId());
        split.put("note", splitItem.note());
        splitItems.put(split);
      }
      item.put("splitItems", splitItems);

      JSONArray tagIds = new JSONArray();
      if (movement.taxonomy() != null && movement.taxonomy().tagIds() != null) {
        for (String tagId : movement.taxonomy().tagIds()) {
          tagIds.put(tagId);
        }
      }
      item.put("tagIds", tagIds);

      if (movement.taxonomy() != null && movement.taxonomy().categoryId() != null) {
        JSONObject category = new JSONObject();
        category.put("id", movement.taxonomy().categoryId());
        category.put("name", categoryNameById.getOrDefault(movement.taxonomy().categoryId(), movement.taxonomy().categoryId()));
        item.put("category", category);
      } else if (movement.categoryId() != null && !movement.categoryId().trim().isEmpty()) {
        JSONObject category = new JSONObject();
        category.put("id", movement.categoryId());
        category.put("name", categoryNameById.getOrDefault(movement.categoryId(), movement.categoryId()));
        item.put("category", category);
      }

      movements.put(item);
    }
    root.put("postedMovements", movements);

    return root.toString(2);
  }

  private String writeBackupFile(String fileName, String json) throws Exception {
    byte[] payload = json.getBytes(StandardCharsets.UTF_8);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ContentValues values = new ContentValues();
      values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
      values.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
      values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Gonezo/Backups");
      values.put(MediaStore.MediaColumns.IS_PENDING, 1);

      ContentResolver resolver = context.getContentResolver();
      Uri collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
      Uri uri = resolver.insert(collection, values);
      if (uri == null) {
        throw new IllegalStateException("Unable to create backup file");
      }

      try (java.io.OutputStream stream = resolver.openOutputStream(uri)) {
        if (stream == null) {
          throw new IllegalStateException("Unable to open backup file");
        }
        stream.write(payload);
      }

      values.clear();
      values.put(MediaStore.MediaColumns.IS_PENDING, 0);
      resolver.update(uri, values, null, null);
      return "Downloads/Gonezo/Backups/" + fileName;
    }

    File directory = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
    File backupDirectory = new File(directory, "Gonezo/Backups");
    if (!backupDirectory.exists() && !backupDirectory.mkdirs()) {
      throw new IllegalStateException("Unable to create backup directory");
    }
    File file = new File(backupDirectory, fileName);
    try (FileOutputStream stream = new FileOutputStream(file)) {
      stream.write(payload);
    }
    return file.getAbsolutePath();
  }

  private String backupFileName(String exportedAt) {
    return "gonezo-backup-" + exportedAt.replace(":", "-").replaceAll("\\.\\d{3}Z$", "Z") + ".json";
  }

  private record MovementsBackupExport(
    String exportedAt,
    List<AndroidLedgerCore.LedgerAccountView> accounts,
    List<AndroidTaxonomyCore.TaxonomyCategoryView> categories,
    List<AndroidTaxonomyCore.TaxonomyTagView> tags,
    List<MovementsBackupPostedMovement> postedMovements
  ) {}

  private record MovementsBackupPostedMovement(
    String id,
    String accountId,
    String type,
    String status,
    String occurredAt,
    String amount,
    String currency,
    String description,
    String merchant,
    String categoryId,
    String linkedTransactionId,
    List<MovementsBackupSplitItem> splitItems,
    AndroidTaxonomyCore.TransactionTaxonomyView taxonomy
  ) {}

  private record MovementsBackupSplitItem(
    String id,
    String name,
    String amount,
    String currency,
    String categoryId,
    String note
  ) {}
}
