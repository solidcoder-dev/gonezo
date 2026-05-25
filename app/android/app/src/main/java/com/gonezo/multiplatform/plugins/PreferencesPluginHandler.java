package com.gonezo.multiplatform.plugins;

import android.content.Context;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginCall;
import com.gonezo.multiplatform.core.AndroidPreferencesCore;
import com.gonezo.preferences.domain.UserPreferences;
import org.json.JSONObject;

final class PreferencesPluginHandler {
  private final Context context;

  PreferencesPluginHandler(Context context) {
    this.context = context;
  }

  void preferencesGet(PluginCall call) {
    try {
      AndroidPreferencesCore core = AndroidPreferencesCore.getInstance(context);
      UserPreferences preferences = core.getPreferences();
      JSObject result = new JSObject();
      if (preferences.getDefaultAccountId() == null) {
        result.put("defaultAccountId", JSONObject.NULL);
      } else {
        result.put("defaultAccountId", preferences.getDefaultAccountId().getValue());
      }
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void preferencesSetDefaultAccount(PluginCall call) {
    try {
      AndroidPreferencesCore.getInstance(context).setDefaultAccount(call.getString("accountId"));
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }

  void preferencesClearDefaultAccount(PluginCall call) {
    try {
      AndroidPreferencesCore.getInstance(context).clearDefaultAccount();
      call.resolve();
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }
}
