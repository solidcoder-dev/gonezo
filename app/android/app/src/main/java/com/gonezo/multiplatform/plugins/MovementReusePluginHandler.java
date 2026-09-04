package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidSharingCore;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.json.JSONArray;

final class MovementReusePluginHandler {
  private final Context context;

  MovementReusePluginHandler(Context context) { this.context = context; }

  void searchGroups(PluginCall call) { respond(call, call.getString("query"), call.getArray("accountIds"), call.getInt("limit", 5), false); }

  void listVariants(PluginCall call) { respond(call, call.getString("normalizedTitle"), call.getArray("accountIds"), 0, true); }

  private void respond(PluginCall call, String query, JSONArray accountIds, int limit, boolean variantsOnly) {
    try {
      String normalizedQuery = normalize(query == null ? "" : query);
      if (normalizedQuery.isEmpty()) { call.resolve(new JSObject().put(variantsOnly ? "variants" : "groups", new JSONArray())); return; }
      List<Candidate> candidates = readCandidates(accountIds);
      List<Variant> rankedVariants = variants(candidates, normalizedQuery);
      if (variantsOnly) {
        JSONArray result = new JSONArray();
        for (Variant variant : rankedVariants) result.put(variant.toJson());
        call.resolve(new JSObject().put("variants", result));
        return;
      }
      Map<String, List<Candidate>> groups = new HashMap<>();
      for (Candidate candidate : candidates) {
        if (candidate.titleKey().contains(normalizedQuery)) groups.computeIfAbsent(candidate.titleKey(), ignored -> new ArrayList<>()).add(candidate);
      }
      List<Group> rankedGroups = new ArrayList<>();
      for (Map.Entry<String, List<Candidate>> entry : groups.entrySet()) {
        List<Variant> groupVariants = variants(entry.getValue(), entry.getKey());
        rankedGroups.add(new Group(entry.getValue().get(0).title, entry.getKey(), groupVariants));
      }
      rankedGroups.sort((left, right) -> left.compareTo(right, normalizedQuery));
      JSONArray result = new JSONArray();
      for (Group group : rankedGroups.subList(0, Math.min(Math.max(limit, 0), rankedGroups.size()))) result.put(group.toJson());
      call.resolve(new JSObject().put("groups", result));
    } catch (Exception ex) { call.reject(ex.getMessage()); }
  }

  private List<Candidate> readCandidates(JSONArray accountIds) {
    AndroidLedgerCore ledger = AndroidLedgerCore.getInstance(context);
    AndroidTaxonomyCore taxonomy = AndroidTaxonomyCore.getInstance(context);
    Set<String> scope = new HashSet<>();
    if (accountIds != null) for (int index = 0; index < accountIds.length(); index++) scope.add(accountIds.optString(index));
    List<Candidate> result = new ArrayList<>();
    for (AndroidLedgerCore.LedgerAccountView account : ledger.listAccounts()) {
      if (!scope.isEmpty() && !scope.contains(account.id())) continue;
      int pageNumber = 0;
      boolean hasNext;
      do {
        AndroidLedgerCore.LedgerTransactionPageView page = ledger.listTransactions(
          account.id(), new AndroidLedgerCore.LedgerTransactionFilterInput(null, null, null, null, null, List.of("posted"), null),
          new AndroidLedgerCore.LedgerPageRequestInput(pageNumber, 100), List.of(new AndroidLedgerCore.LedgerTransactionSortInput("occurredAt", "desc")));
        for (AndroidLedgerCore.LedgerTransactionView transaction : page.content()) {
          String title = transaction.merchant() == null || transaction.merchant().isBlank() ? transaction.description() : transaction.merchant();
          if (title == null || title.isBlank()) continue;
          AndroidTaxonomyCore.TransactionTaxonomyView assignment = taxonomy.listTransactionTaxonomy(List.of(transaction.id())).get(transaction.id());
          List<String> tagIds = assignment == null || assignment.tagIds() == null ? List.of() : assignment.tagIds();
          AndroidSharingCore.MovementDetailsView share = AndroidSharingCore.getInstance(context).getMovementDetails(transaction.id());
          List<String> sharePersonIds = share == null ? List.of() : share.share().participants().stream().map(AndroidSharingCore.ParticipantView::personId).toList();
          result.add(new Candidate(transaction.id(), title, account.id(), account.name(), transaction.type(), transaction.categoryId(), transaction.occurredAt(), tagIds, transaction.items().size(), sharePersonIds));
        }
        hasNext = page.hasNext();
        pageNumber++;
      } while (hasNext);
    }
    return result;
  }

  private List<Variant> variants(List<Candidate> candidates, String titleKey) {
    Map<String, List<Candidate>> byKey = new HashMap<>();
    for (Candidate candidate : candidates) if (candidate.titleKey().equals(titleKey)) byKey.computeIfAbsent(candidate.variantKey(), ignored -> new ArrayList<>()).add(candidate);
    List<Variant> result = new ArrayList<>();
    for (Map.Entry<String, List<Candidate>> entry : byKey.entrySet()) {
      Candidate representative = entry.getValue().stream().max(Comparator.comparing(Candidate::occurredAt).thenComparing(Candidate::id)).orElseThrow();
      result.add(new Variant(representative, entry.getValue().size(), entry.getKey()));
    }
    result.sort(Comparator.comparingInt(Variant::usageCount).reversed().thenComparing(Variant::lastUsedAt, Comparator.reverseOrder()).thenComparing(Variant::key));
    return result;
  }

  private String normalize(String value) { return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}+", "").trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT); }

  private record Candidate(String id, String title, String accountId, String accountName, String type, String categoryId, String occurredAt, List<String> tagIds, int itemCount, List<String> sharePersonIds) {
    String titleKey() { return Normalizer.normalize(title, Normalizer.Form.NFD).replaceAll("\\p{M}+", "").trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT); }
    String variantKey() { return accountId + "|" + type + "|" + (categoryId == null ? "" : categoryId) + "|" + tagIds.stream().sorted().toList() + "|" + itemCount + "|" + sharePersonIds.stream().sorted().toList(); }
  }

  private record Variant(Candidate candidate, int usageCount, String key) {
    String lastUsedAt() { return candidate.occurredAt(); }
    JSObject toJson() { JSONArray tags = new JSONArray(); for (String tagId : candidate.tagIds()) tags.put(new JSObject().put("id", tagId).put("name", tagId)); return new JSObject().put("representativeMovementId", candidate.id()).put("accountId", candidate.accountId()).put("accountName", candidate.accountName()).put("financialType", candidate.type()).put("category", candidate.categoryId() == null ? null : new JSObject().put("id", candidate.categoryId()).put("name", candidate.categoryId())).put("tags", tags).put("itemCount", candidate.itemCount()).put("shareCount", candidate.sharePersonIds().size()).put("usageCount", usageCount).put("lastUsedAt", lastUsedAt()).put("deterministicKey", key); }
  }

  private record Group(String title, String normalizedTitle, List<Variant> variants) {
    int compareTo(Group other, String query) {
      return Boolean.compare(!normalizedTitle.equals(query), !other.normalizedTitle.equals(query)) != 0
        ? Boolean.compare(!normalizedTitle.equals(query), !other.normalizedTitle.equals(query))
        : Boolean.compare(!normalizedTitle.startsWith(query), !other.normalizedTitle.startsWith(query)) != 0
          ? Boolean.compare(!normalizedTitle.startsWith(query), !other.normalizedTitle.startsWith(query))
          : Comparator.comparingInt((Group group) -> group.variants.get(0).usageCount()).reversed().thenComparing(group -> group.variants.get(0).lastUsedAt(), Comparator.reverseOrder()).thenComparing(Group::normalizedTitle).compare(this, other);
    }
    JSObject toJson() { return new JSObject().put("title", title.trim()).put("normalizedTitle", normalizedTitle).put("variantCount", variants.size()).put("primaryVariant", variants.get(0).toJson()); }
  }
}
