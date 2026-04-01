package com.gonezo.multiplatform.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.gonezo.multiplatform.audioextraction.application.AudioExtractionUseCase;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionRequest;
import com.gonezo.multiplatform.audioextraction.contract.ExtractionResult;
import com.gonezo.multiplatform.audioextraction.infrastructure.factory.AudioExtractionModuleFactory;

@CapacitorPlugin(name = "AudioExtractionPlugin")
public class AudioExtractionCapacitorPlugin extends Plugin {
  private AudioExtractionUseCase audioExtractionUseCase;

  @PluginMethod
  public void extract(PluginCall call) {
    JSObject requestObject = call.getObject("request");
    if (requestObject == null) {
      call.reject("request is required");
      return;
    }

    try {
      ExtractionRequest request = ExtractionRequest.fromJson(requestObject);
      ExtractionResult result = useCase().execute(request);

      JSObject response = new JSObject();
      response.put("result", result.toJson());
      call.resolve(response);
    } catch (RuntimeException ex) {
      call.reject(ex.getMessage());
    }
  }

  @PluginMethod
  public void cancel(PluginCall call) {
    String requestId = call.getString("requestId", "").trim();
    if (requestId.isEmpty()) {
      call.reject("requestId is required");
      return;
    }

    useCase().cancel(requestId);
    call.resolve();
  }

  private AudioExtractionUseCase useCase() {
    if (audioExtractionUseCase == null) {
      audioExtractionUseCase = AudioExtractionModuleFactory.create(getContext());
    }
    return audioExtractionUseCase;
  }
}
