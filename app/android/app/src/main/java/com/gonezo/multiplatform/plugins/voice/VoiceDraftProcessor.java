package com.gonezo.multiplatform.plugins.voice;

import com.getcapacitor.JSObject;

public interface VoiceDraftProcessor {
  JSObject process(VoiceDraftProcessingInput input);
}
