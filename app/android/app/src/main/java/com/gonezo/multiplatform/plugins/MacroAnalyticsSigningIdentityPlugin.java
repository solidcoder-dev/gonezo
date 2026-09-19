package com.gonezo.multiplatform.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MacroAnalyticsSigningIdentityPlugin")
public class MacroAnalyticsSigningIdentityPlugin extends Plugin {
  private final AndroidMacroAnalyticsSigningIdentityStore identityStore = new AndroidMacroAnalyticsSigningIdentityStore();

  @PluginMethod
  public void getOrCreateCredential(PluginCall call) {
    try {
      AndroidMacroAnalyticsSigningIdentityStore.Credential credential = identityStore.getOrCreateCredential(call.getString("contributorId"));
      JSObject result = new JSObject();
      result.put("contributorId", credential.contributorId);
      result.put("keyId", credential.keyId);
      result.put("algorithm", credential.algorithm);
      result.put("publicKey", credential.publicKey);
      call.resolve(result);
    } catch (IllegalArgumentException error) {
      call.reject("Analytics contributor ID is required", "INVALID_CONTRIBUTOR_ID");
    } catch (Exception error) {
      call.reject("Macro analytics signing credential is unavailable", "MACRO_ANALYTICS_SIGNING_FAILURE");
    }
  }

  @PluginMethod
  public void sign(PluginCall call) {
    try {
      String signature = identityStore.sign(call.getString("contributorId"), call.getString("payloadBase64Url"));
      JSObject result = new JSObject();
      result.put("signature", signature);
      call.resolve(result);
    } catch (IllegalArgumentException error) {
      call.reject("Contributor ID and payload are required", "INVALID_SIGNING_REQUEST");
    } catch (IllegalStateException error) {
      call.reject("Signing credential is not registered", "MISSING_SIGNING_CREDENTIAL");
    } catch (Exception error) {
      call.reject("Macro analytics publication signing failed", "MACRO_ANALYTICS_SIGNING_FAILURE");
    }
  }
}
