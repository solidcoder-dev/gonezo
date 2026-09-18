package com.gonezo.multiplatform.plugins;

import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AnalyticsProfilePlugin")
public class AnalyticsProfilePlugin extends Plugin {
  private static final String STORE = "gonezo.analytics.profile.v1";

  @PluginMethod
  public void get(PluginCall call) {
    String userId = call.getString("userId");
    if (userId == null || userId.isEmpty()) {
      call.reject("Authenticated user is required", "INVALID_USER");
      return;
    }
    String profile = getContext().getSharedPreferences(STORE, 0).getString(userId, null);
    JSObject result = new JSObject();
    if (profile != null) result.put("profile", new JSObject(profile));
    call.resolve(result);
  }

  @PluginMethod
  public void save(PluginCall call) {
    JSObject profile = call.getObject("profile");
    String userId = profile == null ? null : profile.getString("userId");
    if (profile == null || userId == null || userId.isEmpty()) {
      call.reject("Profile and authenticated user are required", "INVALID_PROFILE");
      return;
    }
    SharedPreferences preferences = getContext().getSharedPreferences(STORE, 0);
    if (!preferences.edit().putString(userId, profile.toString()).commit()) {
      call.reject("Analytics profile could not be saved", "PROFILE_STORAGE_FAILURE");
      return;
    }
    call.resolve();
  }
}
