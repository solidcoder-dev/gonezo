package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidSharingCore;
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
      AndroidSharingCore.ShareView share = AndroidSharingCore.getInstance(context).applyShareToPostedTransaction(
        call.getString("transactionId"),
        call.getString("payerName"),
        toParticipants(call.getArray("participants")),
        call.getString("appliedAt")
      );
      call.resolve(toShareJson(share));
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

  private List<AndroidSharingCore.ParticipantInput> toParticipants(JSONArray values) {
    List<AndroidSharingCore.ParticipantInput> participants = new ArrayList<>();
    if (values == null) {
      return participants;
    }
    for (int index = 0; index < values.length(); index += 1) {
      JSONObject item = values.optJSONObject(index);
      if (item != null) {
        participants.add(new AndroidSharingCore.ParticipantInput(
          item.optString("personName", null),
          item.optString("amount", null),
          item.optBoolean("reimbursable", false)
        ));
      }
    }
    return participants;
  }

  private JSObject toMovementDetailsJson(AndroidSharingCore.MovementDetailsView details) {
    return toShareJson(details.share());
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
