package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidAnalyticsCore;
import com.gonezo.multiplatform.core.AndroidAnalyticsQueryCore;
import com.gonezo.application.query.AnalyticsMovementFact;
import com.gonezo.application.query.AnalyticsMovementReference;
import java.time.Instant;
import org.json.JSONArray;
import java.util.HashSet;

final class AnalyticsPluginHandler {
  private final Context context;

  AnalyticsPluginHandler(Context context) {
    this.context = context;
  }

  void analyticsSetMovementIgnored(PluginCall call) {
    try {
      String source = call.getString("source");
      boolean ignored = call.getBoolean("ignored", false);
      String changedAt = call.getString("changedAt");
      if ("posted".equals(source)) {
        AndroidAnalyticsCore.getInstance(context).setMovementIgnored(
          call.getString("transactionId"), ignored, changedAt
        );
      } else if ("expected".equals(source)) {
        AndroidAnalyticsCore.getInstance(context).setExpectedMovementIgnored(
          call.getString("expectedMovementId"), ignored, changedAt
        );
      } else if ("scheduledProjection".equals(source)) {
        call.reject("scheduled projections cannot be ignored individually");
        return;
      } else {
        call.reject("source must be posted or expected");
        return;
      }
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void analyticsListIgnoredMovements(PluginCall call) {
    try {
      JSONArray movementIds = new JSONArray();
      for (String movementId : AndroidAnalyticsCore.getInstance(context).listIgnoredMovements()) {
        movementIds.put(movementId);
      }
      JSObject result = new JSObject();
      result.put("movementIds", movementIds);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void analyticsListMovementFacts(PluginCall call) {
    try {
      String from = call.getString("fromLocalDate");
      String to = call.getString("toLocalDate");
      String zoneId = call.getString("zoneId");
      if (from == null || to == null || zoneId == null) {
        call.reject("fromLocalDate, toLocalDate and zoneId are required");
        return;
      }
      boolean includePlanned = call.getBoolean("includePlannedMovements", true);
      boolean includeIgnored = call.getBoolean("includeIgnoredMovements", false);
      JSONArray accountIds = call.getArray("accountIds");
      JSONArray tagIds = call.getArray("tagIds");
      var result = new AndroidAnalyticsQueryCore(context).query(
        from, to, zoneId, includePlanned, includeIgnored, call.getString("currency"),
        toStringSet(accountIds), call.getString("categoryId"), toStringSet(tagIds)
      );
      JSONArray items = new JSONArray();
      for (AnalyticsMovementFact fact : result.getFacts()) {
        JSObject item = new JSObject();
        item.put("analyticsFactId", fact.getIdentity().getValue());
        JSObject reference = new JSObject();
        if (fact.getReference() instanceof AnalyticsMovementReference.Posted posted) {
          reference.put("source", "posted");
          reference.put("transactionId", posted.getTransactionId());
        } else if (fact.getReference() instanceof AnalyticsMovementReference.Expected expected) {
          reference.put("source", "expected");
          reference.put("expectedMovementId", expected.getExpectedMovementId());
          if (expected.getRecurringMovementId() != null) reference.put("recurringMovementId", expected.getRecurringMovementId());
          if (expected.getOccurrenceId() != null) reference.put("occurrenceId", expected.getOccurrenceId());
        } else if (fact.getReference() instanceof AnalyticsMovementReference.ScheduledProjection scheduled) {
          reference.put("source", "scheduledProjection");
          reference.put("recurringMovementId", scheduled.getRecurringMovementId());
          reference.put("occurrenceId", scheduled.getOccurrenceId());
        }
        item.put("reference", reference);
        item.put("source", fact.getSource().name());
        item.put("effectiveAt", fact.getEffectiveAt().toString());
        item.put("accountId", fact.getAccountId());
        item.put("type", fact.getType().name().toLowerCase(java.util.Locale.ROOT));
        item.put("currency", fact.getCurrency().getValue());
        item.put("personalAmount", fact.getPersonalAmount().getAmount().toPlainString());
        item.put("fullAmount", fact.getFullAmount().getAmount().toPlainString());
        item.put("ignored", fact.getIgnored());
        if (fact.getCategoryId() != null) item.put("categoryId", fact.getCategoryId());
        item.put("tagIds", new JSONArray(fact.getTagIds()));
        items.put(item);
      }
      JSObject response = new JSObject();
      response.put("items", items);
      call.resolve(response);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  private static java.util.Set<String> toStringSet(JSONArray values) throws org.json.JSONException {
    java.util.Set<String> result = new HashSet<>();
    if (values == null) return result;
    for (int index = 0; index < values.length(); index++) result.add(values.getString(index));
    return result;
  }
}
