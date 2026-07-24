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

final class AnalyticsPluginHandler {
  private final Context context;

  AnalyticsPluginHandler(Context context) {
    this.context = context;
  }

  void analyticsSetMovementIgnored(PluginCall call) {
    try {
      AndroidAnalyticsCore.getInstance(context).setMovementIgnored(
        call.getString("movementId"),
        call.getBoolean("ignored", false),
        call.getString("changedAt")
      );
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
      var result = new AndroidAnalyticsQueryCore(context).query(
        from, to, zoneId, includePlanned, call.getString("currency")
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
}
