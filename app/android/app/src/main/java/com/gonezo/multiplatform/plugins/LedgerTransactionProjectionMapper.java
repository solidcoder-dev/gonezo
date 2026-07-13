package com.gonezo.multiplatform.plugins;

import com.getcapacitor.JSObject;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;

final class LedgerTransactionProjectionMapper {
  private LedgerTransactionProjectionMapper() {}

  static JSObject toJson(
    AndroidLedgerCore.LedgerTransactionView tx,
    AndroidTaxonomyCore.TransactionTaxonomyView taxonomy,
    Map<String, AndroidTaxonomyCore.TaxonomyTagView> tagsById,
    Set<String> ignoredMovementIds
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
    item.put("ignored", ignoredMovementIds.contains(tx.id()));

    String categoryId = taxonomy == null ? null : taxonomy.categoryId();
    if (categoryId == null || categoryId.trim().isEmpty()) {
      categoryId = tx.categoryId();
    }
    item.put("categoryId", categoryId);

    List<String> tagIds = taxonomy == null || taxonomy.tagIds() == null
      ? Collections.emptyList()
      : taxonomy.tagIds();
    JSONArray tags = new JSONArray();
    for (String tagId : tagIds) {
      AndroidTaxonomyCore.TaxonomyTagView tag = tagsById.get(tagId);
      if (tag == null) {
        continue;
      }
      JSObject tagJson = new JSObject();
      tagJson.put("id", tag.id());
      tagJson.put("name", tag.name());
      tags.put(tagJson);
    }
    item.put("tags", tags);
    item.put("categorizationStatus", taxonomy == null ? "none" : taxonomy.categorizationStatus());
    item.put("taggingStatus", taxonomy == null ? "none" : taxonomy.taggingStatus());

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
}
