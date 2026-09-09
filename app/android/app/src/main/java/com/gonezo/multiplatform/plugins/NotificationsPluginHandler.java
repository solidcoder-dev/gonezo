package com.gonezo.multiplatform.plugins;

import android.app.Activity;
import com.getcapacitor.PluginCall;
import com.getcapacitor.JSObject;
import com.gonezo.multiplatform.core.AndroidNotificationsCore;
import com.gonezo.multiplatform.infrastructure.notifications.AndroidNotificationPermissionController;
import org.json.JSONObject;

final class NotificationsPluginHandler {
  private static final int PERMISSION_REQUEST_CODE = 7002;
  private final CorePlugin plugin;

  NotificationsPluginHandler(CorePlugin plugin) {
    this.plugin = plugin;
  }

  void list(PluginCall call) {
    try {
      JSONObject input = call.getData();
      String filter = input.optString("filter", "all");
      String beforeCursor = input.isNull("beforeCursor") ? null : input.optString("beforeCursor", null);
      int limit = input.optInt("limit", 30);
      call.resolve(AndroidNotificationsCore.create(plugin.getContext()).list(filter, beforeCursor, limit));
    } catch (Exception exception) {
      call.reject("NOTIFICATIONS_REQUEST_INVALID");
    }
  }

  void countUnread(PluginCall call) {
    try { call.resolve(AndroidNotificationsCore.create(plugin.getContext()).countUnread()); }
    catch (Exception exception) { call.reject("NOTIFICATIONS_REQUEST_INVALID"); }
  }

  void markRead(PluginCall call) {
    try {
      String id = call.getString("id");
      if (id == null || id.isBlank()) throw new IllegalArgumentException();
      call.resolve(AndroidNotificationsCore.create(plugin.getContext()).markRead(id));
      plugin.notifyNotificationsChanged();
    } catch (Exception exception) { call.reject("NOTIFICATIONS_REQUEST_INVALID"); }
  }

  void markAllRead(PluginCall call) {
    try {
      String cursor = call.getString("throughCursor");
      if (cursor == null || cursor.isBlank()) throw new IllegalArgumentException();
      call.resolve(AndroidNotificationsCore.create(plugin.getContext()).markAllRead(cursor));
      plugin.notifyNotificationsChanged();
    } catch (Exception exception) { call.reject("NOTIFICATIONS_REQUEST_INVALID"); }
  }

  void permissionState(PluginCall call) {
    JSObject result = new JSObject();
    result.put("state", new AndroidNotificationPermissionController(plugin.getContext()).state().name().toLowerCase());
    call.resolve(result);
  }

  void requestPermission(PluginCall call) {
    if (plugin.getActivity() instanceof Activity activity) {
      new AndroidNotificationPermissionController(plugin.getContext()).request(activity, PERMISSION_REQUEST_CODE);
      call.resolve();
    } else call.reject("NOTIFICATIONS_ACTIVITY_UNAVAILABLE");
  }

  void openSettings(PluginCall call) {
    try { new AndroidNotificationPermissionController(plugin.getContext()).openSettings(); call.resolve(); }
    catch (Exception exception) { call.reject("NOTIFICATIONS_SETTINGS_UNAVAILABLE"); }
  }
}
