package com.gonezo.multiplatform.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.gonezo.multiplatform.core.AndroidCore;

@CapacitorPlugin(name = "CorePlugin")
public class CorePlugin extends Plugin {

  @PluginMethod
  public void doThing(PluginCall call) {
    String input = call.getString("input", "");
    String message = com.gonezo.application.CorePing.doThing(input);

    JSObject result = new JSObject();
    result.put("status", "ok");
    result.put("message", message);

    call.resolve(result);
  }

  @PluginMethod
  public void createAccount(PluginCall call) {
    String name = call.getString("name", "");
    String userId = call.getString("userId");
    String type = call.getString("type");
    String currency = call.getString("currency");

    try {
      AndroidCore core = AndroidCore.getInstance(getContext());
      String id = core.createAccount(name, userId, type, currency).toString();
      JSObject result = new JSObject();
      result.put("id", id);
      call.resolve(result);
    } catch (Exception ex) {
      call.reject(ex.getMessage());
    }
  }
}
