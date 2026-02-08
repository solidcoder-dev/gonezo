package com.gonezo.multiplatform.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

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
}
