package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidExpectedCore;
import com.gonezo.multiplatform.core.AndroidLedgerCore;
import com.gonezo.multiplatform.core.AndroidRecurringCore;
import com.gonezo.multiplatform.core.AndroidAnalyticsCore;
import java.util.Set;

final class MovementDetailPluginHandler {
  private final Context context;

  MovementDetailPluginHandler(Context context) { this.context = context; }

  void getDetail(PluginCall call) {
    try {
      String source = required(call.getString("source"), "source");
      String movementId = required(call.getString("movementId"), "movementId");
      JSObject result = new JSObject();
      if ("posted".equals(source)) {
        AndroidLedgerCore.LedgerTransactionView movement = AndroidLedgerCore.getInstance(context).getTransaction(movementId);
        if (movement == null) { result.put("found", false); call.resolve(result); return; }
        result.put("found", true).put("detail", new JSObject().put("source", "posted")
          .put("movement", new LedgerTransactionsQueryHandler(context).projectDirect(movement)));
      } else if ("scheduled".equals(source)) {
        AndroidRecurringCore.RecurringMovementView movement = AndroidRecurringCore.getInstance(context).getRecurringMovement(movementId);
        if (movement == null) { result.put("found", false); call.resolve(result); return; }
        result.put("found", true).put("detail", new JSObject().put("source", "scheduled")
          .put("movement", new RecurringPluginHandler(context).toRecurringMovementJson(movement)));
      } else if ("expected".equals(source)) {
        AndroidExpectedCore.ExpectedMovementView movement = AndroidExpectedCore.getInstance(context).getMovement(movementId);
        if (movement == null) { result.put("found", false); call.resolve(result); return; }
        JSObject origin = new JSObject();
        if (movement.getOriginRecurringMovementId() != null) {
          origin.put("kind", "recurring").put("recurringMovementId", movement.getOriginRecurringMovementId())
            .put("occurrenceId", movement.getOriginOccurrenceId());
          AndroidRecurringCore.RecurringMovementView series = AndroidRecurringCore.getInstance(context)
            .getRecurringMovement(movement.getOriginRecurringMovementId());
          origin.put("series", series == null ? null : new RecurringPluginHandler(context).toRecurringMovementJson(series));
        } else if (movement.getOriginOccurrenceId() != null) {
          origin.put("kind", "recurring_unlinked").put("occurrenceId", movement.getOriginOccurrenceId());
        } else {
          origin.put("kind", "manual");
        }
        result.put("found", true).put("detail", new JSObject().put("source", "expected")
          .put("movement", new ExpectedPluginHandler(context).toExpectedMovementJson(
            movement,
            new java.util.HashSet<>(AndroidAnalyticsCore.getInstance(context).listIgnoredExpectedMovements())))
          .put("origin", origin));
      } else {
        throw new IllegalArgumentException("source is invalid");
      }
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  private String required(String value, String field) {
    if (value == null || value.trim().isEmpty()) throw new IllegalArgumentException(field + " is required");
    return value.trim();
  }
}
