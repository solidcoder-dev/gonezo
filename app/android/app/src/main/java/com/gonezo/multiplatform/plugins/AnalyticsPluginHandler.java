package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidAnalyticsCore;
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
}
