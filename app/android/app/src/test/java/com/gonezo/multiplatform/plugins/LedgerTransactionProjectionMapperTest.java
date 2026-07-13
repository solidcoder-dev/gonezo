package com.gonezo.multiplatform.plugins;

import static org.junit.Assert.assertEquals;

import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class LedgerTransactionProjectionMapperTest {

  @Test
  public void projectsTagsStatusesCategoryItemsAndIgnoredFlag() throws Exception {
    AndroidLedgerCore.LedgerTransactionView transaction = transaction();
    AndroidTaxonomyCore.TransactionTaxonomyView taxonomy = new AndroidTaxonomyCore.TransactionTaxonomyView(
      "transaction-1",
      "taxonomy-category",
      List.of("tag-1", "tag-2", "unknown-tag"),
      "assigned",
      "assigned"
    );

    JSONObject result = LedgerTransactionProjectionMapper.toJson(
      transaction,
      taxonomy,
      Map.of(
        "tag-1", new AndroidTaxonomyCore.TaxonomyTagView("tag-1", "Trip", "active"),
        "tag-2", new AndroidTaxonomyCore.TaxonomyTagView("tag-2", "Archived trip", "archived")
      ),
      Set.of("transaction-1")
    );

    JSONArray tags = result.getJSONArray("tags");
    assertEquals(2, tags.length());
    assertEquals("tag-1", tags.getJSONObject(0).getString("id"));
    assertEquals("Trip", tags.getJSONObject(0).getString("name"));
    assertEquals("tag-2", tags.getJSONObject(1).getString("id"));
    assertEquals("Archived trip", tags.getJSONObject(1).getString("name"));
    assertEquals("assigned", result.getString("taggingStatus"));
    assertEquals("assigned", result.getString("categorizationStatus"));
    assertEquals("taxonomy-category", result.getString("categoryId"));
    assertEquals(true, result.getBoolean("ignored"));
    assertEquals(1, result.getJSONArray("items").length());
  }

  @Test
  public void usesEmptyTaxonomyDefaultsAndPreservesLedgerCategory() throws Exception {
    JSONObject result = LedgerTransactionProjectionMapper.toJson(
      transaction(),
      null,
      Map.of(),
      Set.of()
    );

    assertEquals("ledger-category", result.getString("categoryId"));
    assertEquals(0, result.getJSONArray("tags").length());
    assertEquals("none", result.getString("taggingStatus"));
    assertEquals("none", result.getString("categorizationStatus"));
  }

  private AndroidLedgerCore.LedgerTransactionView transaction() {
    return new AndroidLedgerCore.LedgerTransactionView(
      "transaction-1",
      "account-1",
      "expense",
      "posted",
      "25.00",
      "EUR",
      "2026-07-14T10:00:00.000Z",
      "Trip",
      "Merchant",
      "ledger-category",
      null,
      List.of(new AndroidLedgerCore.LedgerTransactionItemView(
        "item-1", "Ticket", "25.00", "EUR", null, null
      ))
    );
  }
}
