package com.gonezo.multiplatform;

import android.os.Bundle;
import android.view.View;
import com.gonezo.multiplatform.systemui.AndroidSystemBarsController;
import com.getcapacitor.BridgeActivity;
import com.gonezo.multiplatform.plugins.CorePlugin;
import com.gonezo.multiplatform.plugins.audio.AudioCapturePlugin;
import com.gonezo.multiplatform.plugins.interpretation.SchemaGuidedInterpretationPlugin;
import com.gonezo.multiplatform.plugins.interpretation.export.InterpretationRunExportPlugin;
import com.gonezo.multiplatform.plugins.speech.SpeechTranscriptionPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(CorePlugin.class);
    registerPlugin(AudioCapturePlugin.class);
    registerPlugin(SchemaGuidedInterpretationPlugin.class);
    registerPlugin(InterpretationRunExportPlugin.class);
    registerPlugin(SpeechTranscriptionPlugin.class);
    super.onCreate(savedInstanceState);
    View appShell = resolveAppShell();
    if (appShell != null) {
      new AndroidSystemBarsController(this).configure(appShell);
    }
  }

  private View resolveAppShell() {
    View appShell = findViewById(R.id.app_shell);
    if (appShell != null) {
      return appShell;
    }

    View webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView != null && webView.getParent() instanceof View) {
      return (View) webView.getParent();
    }

    return webView;
  }
}
