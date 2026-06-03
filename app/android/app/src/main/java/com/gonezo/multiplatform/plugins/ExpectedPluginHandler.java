package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidExpectedCore;
import com.gonezo.multiplatform.core.AndroidRecurringExpectedRuntime;
import java.time.Instant;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;

final class ExpectedPluginHandler {
  private final Context context;

  ExpectedPluginHandler(Context context) {
    this.context = context;
  }

  void expectedCreateMovement(PluginCall call) {
    try {
      UUID id = AndroidExpectedCore.getInstance(context).createMovement(
        call.getString("accountId"),
        call.getString("type"),
        call.getString("amount"),
        call.getString("currency"),
        call.getString("expectedAt"),
        call.getString("description"),
        call.getString("merchant"),
        call.getString("categoryId"),
        call.getString("originOccurrenceId"),
        call.getString("originRecurringMovementId"),
        toJsonStringOrNull(call.getArray("splitItems"))
      );
      JSObject result = new JSObject();
      result.put("id", id.toString());
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void expectedUpdateMovement(PluginCall call) {
    try {
      UUID id = AndroidExpectedCore.getInstance(context).updateMovement(
        call.getString("expectedMovementId"),
        call.getString("accountId"),
        call.getString("type"),
        call.getString("amount"),
        call.getString("currency"),
        call.getString("expectedAt"),
        call.getString("description"),
        call.getString("merchant"),
        call.getString("categoryId"),
        toJsonStringOrNull(call.getArray("splitItems"))
      );
      JSObject result = new JSObject();
      result.put("id", id.toString());
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void expectedListMovements(PluginCall call) {
    try {
      Boolean includeClosedValue = call.getBoolean("includeClosed");
      boolean includeClosed = includeClosedValue != null && includeClosedValue;
      AndroidExpectedCore expectedCore = AndroidExpectedCore.getInstance(context);
      JSONArray items = new JSONArray();
      for (AndroidExpectedCore.ExpectedMovementView movement : expectedCore.listMovements(
        call.getString("accountId"),
        includeClosed
      )) {
        items.put(toExpectedMovementJson(movement));
      }
      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void expectedResolveMovement(PluginCall call) {
    try {
      String resolvedAt = call.getString("resolvedAt", Instant.now().toString());
      String expectedMovementId = call.getString("expectedMovementId");
      String transactionId = call.getString("transactionId");
      AndroidExpectedCore.getInstance(context).resolveMovement(
        expectedMovementId,
        transactionId,
        resolvedAt
      );
      AndroidRecurringExpectedRuntime.getInstance(context).continueAfterResolution(
        expectedMovementId,
        transactionId,
        resolvedAt
      );
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void expectedDismissMovement(PluginCall call) {
    try {
      String dismissedAt = call.getString("dismissedAt", Instant.now().toString());
      String expectedMovementId = call.getString("expectedMovementId");
      AndroidExpectedCore.getInstance(context).dismissMovement(
        expectedMovementId,
        dismissedAt
      );
      AndroidRecurringExpectedRuntime.getInstance(context).continueAfterDismissal(expectedMovementId, dismissedAt);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  private JSObject toExpectedMovementJson(AndroidExpectedCore.ExpectedMovementView movement) {
    JSObject result = new JSObject();
    result.put("id", movement.getId());
    result.put("accountId", movement.getAccountId());
    result.put("type", movement.getType());
    result.put("amount", movement.getAmount());
    result.put("currency", movement.getCurrency());
    result.put("expectedAt", movement.getExpectedAt());
    result.put("description", movement.getDescription());
    result.put("merchant", movement.getMerchant());
    result.put("categoryId", movement.getCategoryId());
    result.put("originOccurrenceId", movement.getOriginOccurrenceId());
    result.put("originRecurringMovementId", movement.getOriginRecurringMovementId());
    JSONArray splitItems = new JSONArray();
    for (AndroidExpectedCore.SplitItem item : movement.getSplitItems()) {
      JSObject split = new JSObject();
      split.put("id", item.getId());
      split.put("name", item.getName());
      split.put("amount", item.getAmount());
      splitItems.put(split);
    }
    result.put("splitItems", splitItems);
    result.put("status", movement.getStatus());
    result.put("resolvedTransactionId", movement.getResolvedTransactionId());
    result.put("createdAt", movement.getCreatedAt());
    result.put("updatedAt", movement.getUpdatedAt());
    result.put("resolvedAt", movement.getResolvedAt());
    result.put("dismissedAt", movement.getDismissedAt());
    return result;
  }

  private String toJsonStringOrNull(JSONArray value) {
    return value == null ? null : value.toString();
  }
}
