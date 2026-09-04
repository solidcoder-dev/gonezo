package com.gonezo.multiplatform.core;

import com.gonezo.application.query.MovementReuseCandidateRead;
import com.gonezo.application.query.MovementReuseSuggestionsReadPort;
import com.gonezo.application.query.MovementReuseTaxonomyRef;
import com.gonezo.application.query.MovementReuseTemplateRead;
import com.gonezo.application.query.MovementReuseTemplateReadPort;
import com.gonezo.application.query.MovementReuseTemplatePerson;
import com.gonezo.application.query.MovementReuseTemplateTaxonomyRef;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class AndroidMovementReuseSuggestionsReadAdapter implements MovementReuseSuggestionsReadPort, MovementReuseTemplateReadPort {
  private final android.content.Context context;
  private final AndroidLedgerCore ledger;
  private final AndroidTaxonomyCore taxonomy;
  private final AndroidSharingCore sharing;

  public AndroidMovementReuseSuggestionsReadAdapter(android.content.Context context, AndroidLedgerCore ledger, AndroidTaxonomyCore taxonomy, AndroidSharingCore sharing) {
    this.context = context; this.ledger = ledger; this.taxonomy = taxonomy; this.sharing = sharing;
  }

  @Override public Iterable<MovementReuseCandidateRead> readPostedCandidates(Set<String> accountIds) {
    Map<String, AndroidLedgerCore.LedgerAccountView> accounts = new HashMap<>();
    for (var account : ledger.listAccounts()) if (accountIds.isEmpty() || accountIds.contains(account.id())) accounts.put(account.id(), account);
    List<AndroidLedgerCore.LedgerTransactionView> transactions = new ArrayList<>();
    for (var account : accounts.values()) {
      int page = 0; boolean hasNext;
      do {
        var result = ledger.listTransactions(account.id(), new AndroidLedgerCore.LedgerTransactionFilterInput(null, null, null, null, null, List.of("posted"), null), new AndroidLedgerCore.LedgerPageRequestInput(page, 100), List.of(new AndroidLedgerCore.LedgerTransactionSortInput("occurredAt", "desc")));
        transactions.addAll(result.content()); hasNext = result.hasNext(); page++;
      } while (hasNext);
    }
    List<String> ids = transactions.stream().map(AndroidLedgerCore.LedgerTransactionView::id).toList();
    var assignments = taxonomy.listTransactionTaxonomy(ids);
    Map<String, AndroidTaxonomyCore.TaxonomyCategoryView> categories = new HashMap<>();
    taxonomy.listCategories("expense", false).forEach(value -> categories.put(value.id(), value));
    taxonomy.listCategories("income", false).forEach(value -> categories.put(value.id(), value));
    Map<String, AndroidTaxonomyCore.TaxonomyTagView> tags = new HashMap<>();
    taxonomy.listTags(false).forEach(value -> tags.put(value.id(), value));
    Map<String, AndroidSharingCore.MovementDetailsView> shares = new HashMap<>();
    sharing.listMovementDetails(ids).forEach(value -> { if (value != null && value.share() != null) shares.put(value.share().transactionId(), value); });
    List<MovementReuseCandidateRead> result = new ArrayList<>();
    for (var transaction : transactions) {
      String title = transaction.merchant() == null || transaction.merchant().isBlank() ? transaction.description() : transaction.merchant();
      if (title == null || title.isBlank()) continue;
      var assignment = assignments.get(transaction.id());
      var category = assignment == null || assignment.categoryId() == null ? null : categories.get(assignment.categoryId());
      List<MovementReuseTaxonomyRef> taxonomyTags = new ArrayList<>();
      if (assignment != null && assignment.tagIds() != null) for (String tagId : assignment.tagIds()) { var tag = tags.get(tagId); if (tag != null) taxonomyTags.add(new MovementReuseTaxonomyRef(tag.id(), tag.name())); }
      List<String> people = new ArrayList<>(); var share = shares.get(transaction.id());
      if (share != null) share.share().participants().forEach(value -> people.add(value.personId()));
      var account = accounts.get(transaction.accountId());
      result.add(new MovementReuseCandidateRead(transaction.id(), title, transaction.accountId(), account.name(), transaction.type(), category == null ? null : new MovementReuseTaxonomyRef(category.id(), category.name()), taxonomyTags, transaction.items().stream().map(AndroidLedgerCore.LedgerTransactionItemView::name).toList(), people, true, true, transaction.occurredAt()));
    }
    return result;
  }

  @Override public MovementReuseTemplateRead readTemplate(String representativeMovementId) {
    for (AndroidLedgerCore.LedgerAccountView account : ledger.listAccounts()) {
      var page = ledger.listTransactions(account.id(), new AndroidLedgerCore.LedgerTransactionFilterInput(null, null, null, null, null, List.of("posted"), null), new AndroidLedgerCore.LedgerPageRequestInput(0, 1000), List.of(new AndroidLedgerCore.LedgerTransactionSortInput("occurredAt", "desc")));
      for (var transaction : page.content()) if (transaction.id().equals(representativeMovementId)) return template(transaction, account);
    }
    return null;
  }

  private MovementReuseTemplateRead template(AndroidLedgerCore.LedgerTransactionView transaction, AndroidLedgerCore.LedgerAccountView account) {
    var assignment = taxonomy.listTransactionTaxonomy(List.of(transaction.id())).get(transaction.id());
    Map<String, AndroidTaxonomyCore.TaxonomyCategoryView> categories = new HashMap<>();
    taxonomy.listCategories(transaction.type(), false).forEach(value -> categories.put(value.id(), value));
    var category = assignment == null || assignment.categoryId() == null ? null : categories.get(assignment.categoryId());
    Map<String, AndroidTaxonomyCore.TaxonomyTagView> tags = new HashMap<>();
    taxonomy.listTags(false).forEach(value -> tags.put(value.id(), value));
    List<MovementReuseTemplateTaxonomyRef> templateTags = new ArrayList<>();
    if (assignment != null && assignment.tagIds() != null) for (String tagId : assignment.tagIds()) { var tag = tags.get(tagId); if (tag != null) templateTags.add(new MovementReuseTemplateTaxonomyRef(tag.id(), tag.name())); }
    List<MovementReuseTemplatePerson> people = new ArrayList<>();
    var details = sharing.getMovementDetails(transaction.id());
    if (details != null && details.share() != null) for (var participant : details.share().participants()) people.add(new MovementReuseTemplatePerson(participant.personId(), participant.displayName(), null, participant.reimbursable(), null));
    String targetAccountId = null;
    if (transaction.linkedTransactionId() != null) for (var target : ledger.listAccounts()) {
      var targetPage = ledger.listTransactions(target.id(), new AndroidLedgerCore.LedgerTransactionFilterInput(null, null, null, null, null, List.of("posted"), null), new AndroidLedgerCore.LedgerPageRequestInput(0, 1000), List.of(new AndroidLedgerCore.LedgerTransactionSortInput("occurredAt", "desc")));
      if (targetPage.content().stream().anyMatch(value -> transaction.linkedTransactionId().equals(value.id()))) { targetAccountId = target.id(); break; }
    }
    boolean ignored;
    try (var cursor = new CoreDatabase(context).getReadableDatabase().query("analytics_exclusions", new String[]{"id"}, "scope_type = ? and scope_id = ? and reason = ?", new String[]{"movement", transaction.id(), "user_ignored"}, null, null, null, "1")) { ignored = cursor.moveToFirst(); }
    return new MovementReuseTemplateRead(transaction.id(), transaction.merchant() == null || transaction.merchant().isBlank() ? transaction.description() : transaction.merchant(), account.id(), account.name(), transaction.type(), category == null ? null : new MovementReuseTemplateTaxonomyRef(category.id(), category.name()), templateTags, transaction.items().stream().map(AndroidLedgerCore.LedgerTransactionItemView::name).toList(), people, targetAccountId, ignored);
  }

}
