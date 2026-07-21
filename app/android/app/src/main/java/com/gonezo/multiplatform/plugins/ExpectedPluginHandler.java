package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidAnalyticsCore;
import com.gonezo.multiplatform.core.AndroidExpectedCore;
import com.gonezo.multiplatform.core.AndroidExpectedPostingApplication;
import com.gonezo.application.orchestration.PostExpectedMovementCommand;
import com.gonezo.sharing.application.FinalPlannedShareDraft;
import com.gonezo.sharing.application.FinalPlannedShareParticipant;
import com.gonezo.multiplatform.core.AndroidRecurringExpectedRuntime;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;
import org.json.JSONArray;

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
      AndroidAnalyticsCore.getInstance(context).setExpectedMovementIgnored(
        id.toString(),
        call.getBoolean("ignored", false),
        Instant.now().toString()
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
      Boolean ignored = call.getBoolean("ignored");
      if (ignored != null) {
        AndroidAnalyticsCore.getInstance(context).setExpectedMovementIgnored(
          id.toString(),
          ignored,
          Instant.now().toString()
        );
      }
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
      Set<String> ignoredExpectedMovementIds = new HashSet<>(
        AndroidAnalyticsCore.getInstance(context).listIgnoredExpectedMovements()
      );
      JSONArray items = new JSONArray();
      for (AndroidExpectedCore.ExpectedMovementView movement : expectedCore.listMovements(
        call.getString("accountId"),
        includeClosed
      )) {
        items.put(toExpectedMovementJson(movement, ignoredExpectedMovementIds));
      }
      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void expectedGetPendingOverview(PluginCall call) {
    try {
      var overview = AndroidExpectedCore.getInstance(context).getPendingOverview();
      JSObject result = new JSObject();
      result.put("expenses", toPendingExpectedSummaryJson(overview.getExpenses()));
      result.put("incomes", toPendingExpectedSummaryJson(overview.getIncomes()));
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  private JSObject toPendingExpectedSummaryJson(com.gonezo.application.query.PendingExpectedTypeSummary summary) {
    JSObject result = new JSObject();
    result.put("totalCount", summary.getTotalCount());
    JSONArray amounts = new JSONArray();
    for (com.gonezo.application.query.PendingExpectedCurrencySummary item : summary.getAmountsByCurrency()) {
      JSObject amount = new JSObject();
      amount.put("currency", item.getCurrency());
      amount.put("amount", item.getAmount());
      amount.put("movementCount", item.getMovementCount());
      amounts.put(amount);
    }
    result.put("amountsByCurrency", amounts);
    return result;
  }

  void expectedResolveMovement(PluginCall call) {
    try {
      String resolvedAt = call.getString("resolvedAt", Instant.now().toString());
      String expectedMovementId = call.getString("expectedMovementId");
      String transactionId = call.getString("transactionId");
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
      AndroidRecurringExpectedRuntime.getInstance(context).continueAfterDismissal(expectedMovementId, dismissedAt);
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void expectedPostMovement(PluginCall call) {
    try {
      PostExpectedMovementCommand command = new PostExpectedMovementCommand(
        call.getString("expectedMovementId"),
        Instant.parse(call.getString("occurredAt")),
        call.getString("categoryId"),
        toTagNames(call.getArray("tagNames")),
        call.getBoolean("ignored", false),
        toSharingOverride(call.getObject("sharingOverride")),
        call.getString("idempotencyKey")
      );
      var posting = AndroidExpectedPostingApplication.getInstance(context).execute(command);
      JSObject response = new JSObject();
      response.put("transactionId", posting.getTransactionId());
      response.put("shareId", posting.getShareId());
      response.put("nextExpectedMovementId", posting.getNextExpectedMovementId());
      call.resolve(response);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  private List<String> toTagNames(JSONArray values) {
    List<String> names = new ArrayList<>();
    if (values == null) return names;
    for (int index = 0; index < values.length(); index++) {
      String name = values.optString(index, "").trim();
      if (!name.isEmpty() && !names.contains(name)) names.add(name);
    }
    return names;
  }

  private FinalPlannedShareDraft toSharingOverride(JSONObject value) throws Exception {
    if (value == null) return null;
    JSONArray rawParticipants = value.optJSONArray("participants");
    List<FinalPlannedShareParticipant> participants = new ArrayList<>();
    if (rawParticipants != null) {
      for (int index = 0; index < rawParticipants.length(); index++) {
        JSONObject participant = rawParticipants.optJSONObject(index);
        if (participant == null) continue;
        participants.add(new FinalPlannedShareParticipant(
          participant.getString("personName"),
          new java.math.BigDecimal(participant.getString("amount")),
          participant.optBoolean("reimbursable", false)
        ));
      }
    }
    return new FinalPlannedShareDraft(value.getString("payerName"), participants);
  }

  private JSObject toExpectedMovementJson(
    AndroidExpectedCore.ExpectedMovementView movement,
    Set<String> ignoredExpectedMovementIds
  ) {
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
      split.put("sourceTemplateItemId", item.getSourceTemplateItemId());
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
    result.put("ignored", ignoredExpectedMovementIds.contains(movement.getId()));
    return result;
  }

  private String toJsonStringOrNull(JSONArray value) {
    return value == null ? null : value.toString();
  }

}
