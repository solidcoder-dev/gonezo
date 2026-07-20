package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidSharingCore;
import com.gonezo.multiplatform.core.AndroidExpectedPostingApplication;
import com.gonezo.sharing.application.ApplyShareParticipantCommand;
import com.gonezo.sharing.application.ApplyShareToPostedTransactionCommand;
import com.gonezo.sharing.application.ApplyShareToPostedTransactionResult;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

final class SharingPluginHandler {
  private final Context context;

  SharingPluginHandler(Context context) {
    this.context = context;
  }

  void sharingListPeople(PluginCall call) {
    try {
      JSONArray items = new JSONArray();
      for (AndroidSharingCore.PersonView person : AndroidSharingCore.getInstance(context).listPeople()) {
        JSObject item = new JSObject();
        item.put("id", person.id());
        item.put("name", person.displayName());
        items.put(item);
      }
      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void sharingApplyShareToPostedTransaction(PluginCall call) {
    try {
      ApplyShareToPostedTransactionResult share = AndroidExpectedPostingApplication.getInstance(context).applyShare(
        new ApplyShareToPostedTransactionCommand(
          call.getString("transactionId"), call.getString("payerName"), toCoreParticipants(call.getArray("participants")),
          Instant.parse(call.getString("appliedAt", Instant.now().toString()))
        )
      );
      JSObject result = new JSObject();
      result.put("shareId", share.getShareId());
      result.put("transactionId", share.getTransactionId());
      JSONArray participants = new JSONArray();
      for (var participant : share.getParticipants()) {
        JSObject item = new JSObject();
        item.put("participantId", participant.getParticipantId());
        item.put("personId", participant.getPersonId());
        item.put("displayName", participant.getDisplayName());
        item.put("amount", participant.getAmount().toPlainString());
        item.put("reimbursable", participant.getReimbursable());
        item.put("expectedMovementId", JSONObject.NULL);
        participants.put(item);
      }
      result.put("participants", participants);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void sharingGetMovementDetails(PluginCall call) {
    try {
      AndroidSharingCore.MovementDetailsView details = AndroidSharingCore.getInstance(context).getMovementDetails(
        call.getString("transactionId")
      );
      call.resolve(details == null ? null : toMovementDetailsJson(details));
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void sharingListMovementDetails(PluginCall call) {
    try {
      JSONArray items = new JSONArray();
      for (AndroidSharingCore.MovementDetailsView details : AndroidSharingCore.getInstance(context).listMovementDetails(
        toTransactionIds(call.getArray("transactionIds"))
      )) {
        items.put(toMovementDetailsJson(details));
      }
      JSObject result = new JSObject();
      result.put("items", items);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void sharingGetPlannedShare(PluginCall call) {
    try {
      AndroidSharingCore.PlannedShareView share = AndroidSharingCore.getInstance(context).getPlannedShare(
        call.getString("expectedMovementId")
      );
      call.resolve(share == null ? null : toPlannedShareJson(share));
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  private JSObject toPlannedShareJson(AndroidSharingCore.PlannedShareView share) {
    JSObject result = new JSObject();
    result.put("expectedMovementId", share.expectedMovementId());
    JSObject payer = new JSObject();
    payer.put("personId", share.payerPersonId());
    payer.put("name", share.payerName());
    payer.put("parts", share.payerParts());
    result.put("payer", payer);
    result.put("mode", share.mode());
    result.put("totalAmount", share.totalAmount());
    result.put("currency", share.currency());
    JSONArray participants = new JSONArray();
    for (AndroidSharingCore.PlannedParticipantView participant : share.participants()) {
      JSObject item = new JSObject();
      item.put("participantId", participant.participantId());
      item.put("personId", participant.personId());
      item.put("name", participant.displayName());
      item.put("parts", participant.parts());
      item.put("amount", participant.amount());
      item.put("reimbursable", participant.reimbursable());
      participants.put(item);
    }
    result.put("participants", participants);
    return result;
  }

  private List<ApplyShareParticipantCommand> toCoreParticipants(JSONArray values) {
    List<ApplyShareParticipantCommand> participants = new ArrayList<>();
    if (values == null) return participants;
    for (int index = 0; index < values.length(); index += 1) {
      JSONObject item = values.optJSONObject(index);
      if (item != null) {
        participants.add(new ApplyShareParticipantCommand(
          item.optString("personName", null), new BigDecimal(item.optString("amount", null)), item.optBoolean("reimbursable", false)
        ));
      }
    }
    return participants;
  }

  private JSObject toMovementDetailsJson(AndroidSharingCore.MovementDetailsView details) {
    return toShareJson(details.share());
  }

  private List<String> toTransactionIds(JSONArray values) {
    List<String> items = new ArrayList<>();
    if (values == null) {
      return items;
    }
    for (int index = 0; index < values.length(); index += 1) {
      String value = values.optString(index, null);
      if (value != null && !value.isBlank()) {
        items.add(value.trim());
      }
    }
    return items;
  }

  private JSObject toShareJson(AndroidSharingCore.ShareView share) {
    JSObject result = new JSObject();
    result.put("shareId", share.shareId());
    result.put("transactionId", share.transactionId());
    result.put("participants", toParticipantsJson(share.participants()));
    result.put("analytics", toAnalyticsJson(share.analytics()));
    return result;
  }

  private JSONArray toParticipantsJson(List<AndroidSharingCore.ParticipantView> participants) {
    JSONArray items = new JSONArray();
    for (AndroidSharingCore.ParticipantView participant : participants) {
      JSObject item = new JSObject();
      item.put("participantId", participant.participantId());
      item.put("personId", participant.personId());
      item.put("displayName", participant.displayName());
      item.put("amount", participant.amount());
      item.put("reimbursable", participant.reimbursable());
      item.put("expectedMovementId", participant.expectedMovementId());
      item.put("repaymentStatus", participant.repaymentStatus());
      items.put(item);
    }
    return items;
  }

  private JSObject toAnalyticsJson(AndroidSharingCore.AnalyticsView analytics) {
    JSObject result = new JSObject();
    result.put("personalExpenseAmount", analytics.personalExpenseAmount());
    result.put("excludedLentAmount", analytics.excludedLentAmount());
    result.put("excludedReimbursementIncomeAmount", analytics.excludedReimbursementIncomeAmount());
    return result;
  }
}
