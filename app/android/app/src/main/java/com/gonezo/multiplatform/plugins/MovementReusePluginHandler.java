package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.application.query.MovementReuseSuggestionGroup;
import com.gonezo.application.query.MovementReuseSuggestionVariant;
import com.gonezo.application.query.MovementReuseSuggestionsQuery;
import com.gonezo.application.query.MovementReuseSuggestionsQueryService;
import com.gonezo.application.query.MovementReuseTemplateQuery;
import com.gonezo.application.query.MovementReuseTemplateQueryService;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidMovementReuseSuggestionsReadAdapter;
import com.gonezo.multiplatform.core.AndroidSharingCore;
import com.gonezo.multiplatform.core.AndroidTaxonomyCore;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;

final class MovementReusePluginHandler {
  private final Context context;
  MovementReusePluginHandler(Context context) { this.context = context; }

  void searchGroups(PluginCall call) {
    try { call.resolve(groupsJson(service().search(new MovementReuseSuggestionsQuery(call.getString("query", ""), ids(call.getArray("accountIds")), call.getInt("limit", 5))))); }
    catch (Exception ex) { call.reject(ex.getMessage()); }
  }

  void listVariants(PluginCall call) {
    try { JSONArray variants = new JSONArray(); for (var value : service().variants(call.getString("normalizedTitle", ""), ids(call.getArray("accountIds")))) variants.put(variantJson(value)); call.resolve(new JSObject().put("variants", variants)); }
    catch (Exception ex) { call.reject(ex.getMessage()); }
  }

  void getTemplate(PluginCall call) {
    try {
      var template = new MovementReuseTemplateQueryService(adapter()).get(new MovementReuseTemplateQuery(call.getString("representativeMovementId", "")));
      if (template == null) { call.reject("Movement reuse template not found"); return; }
      JSONArray tags = new JSONArray(); template.getTags().forEach(tag -> tags.put(new JSObject().put("id", tag.getId()).put("name", tag.getName())));
      JSONArray items = new JSONArray(); template.getItemNames().forEach(items::put);
      JSONArray people = new JSONArray(); template.getSharingPeople().forEach(person -> people.put(new JSObject().put("id", person.getId()).put("name", person.getName()).put("reimbursable", person.getReimbursable()).put("parts", person.getParts())));
      var category = template.getCategory();
      call.resolve(new JSObject().put("representativeMovementId", template.getMovementId()).put("title", template.getTitle()).put("accountId", template.getAccountId()).put("accountName", template.getAccountName()).put("financialType", template.getFinancialType()).put("category", category == null ? null : new JSObject().put("id", category.getId()).put("name", category.getName())).put("tags", tags).put("itemNames", items).put("sharingPeople", people).put("targetAccountId", template.getTargetAccountId()).put("ignored", template.getIgnored()));
    } catch (Exception ex) { call.reject(ex.getMessage()); }
  }

  private AndroidMovementReuseSuggestionsReadAdapter adapter() { return new AndroidMovementReuseSuggestionsReadAdapter(context, AndroidLedgerCore.getInstance(context), AndroidTaxonomyCore.getInstance(context), AndroidSharingCore.getInstance(context)); }
  private MovementReuseSuggestionsQueryService service() { return new MovementReuseSuggestionsQueryService(adapter()); }
  private Set<String> ids(JSONArray values) { Set<String> result = new HashSet<>(); if (values != null) for (int i = 0; i < values.length(); i++) result.add(values.optString(i)); return result; }
  private JSObject groupsJson(com.gonezo.application.query.MovementReuseSuggestionsResult result) { JSONArray groups = new JSONArray(); for (MovementReuseSuggestionGroup group : result.getGroups()) groups.put(new JSObject().put("title", group.getTitle()).put("normalizedTitle", group.getNormalizedTitle()).put("variantCount", group.getVariantCount()).put("primaryVariant", variantJson(group.getPrimaryVariant()))); return new JSObject().put("groups", groups); }
  private JSObject variantJson(MovementReuseSuggestionVariant value) { JSONArray tags = new JSONArray(); value.getTags().forEach(tag -> tags.put(new JSObject().put("id", tag.getId()).put("name", tag.getName()))); var category = value.getCategory(); return new JSObject().put("representativeMovementId", value.getRepresentativeMovementId()).put("accountId", value.getAccountId()).put("accountName", value.getAccountName()).put("financialType", value.getFinancialType()).put("category", category == null ? null : new JSObject().put("id", category.getId()).put("name", category.getName())).put("tags", tags).put("itemCount", value.getItemCount()).put("shareCount", value.getShareCount()).put("usageCount", value.getUsageCount()).put("lastUsedAt", value.getLastUsedAt()).put("deterministicKey", value.getDeterministicKey()); }
}
