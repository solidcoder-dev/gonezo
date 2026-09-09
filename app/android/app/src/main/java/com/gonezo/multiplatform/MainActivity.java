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
import com.gonezo.multiplatform.notifications.NotificationMaintenanceScheduler;
import com.gonezo.multiplatform.notifications.NotificationIntentContract;
import android.content.Intent;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(CorePlugin.class);
    registerPlugin(AudioCapturePlugin.class);
    registerPlugin(SchemaGuidedInterpretationPlugin.class);
    registerPlugin(InterpretationRunExportPlugin.class);
    registerPlugin(SpeechTranscriptionPlugin.class);
    super.onCreate(savedInstanceState);
    captureNotificationIntent(getIntent());
    View appShell = resolveAppShell();
    if (appShell != null) {
      new AndroidSystemBarsController(this).configure(appShell);
    }
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    captureNotificationIntent(intent);
  }

  private boolean pendingNotificationsIntent;

  private void captureNotificationIntent(Intent intent) {
    if (NotificationIntentContract.requestsInbox(intent)) {
      pendingNotificationsIntent = true;
      dispatchPendingNotificationsIntent();
    }
  }

  private void dispatchPendingNotificationsIntent() {
    if (!pendingNotificationsIntent || getBridge() == null) return;
    getBridge().triggerJSEvent("gonezoNotificationIntent", "window", "{}");
    pendingNotificationsIntent = false;
  }

  @Override
  public void onResume() {
    super.onResume();
    dispatchPendingNotificationsIntent();
    NotificationMaintenanceScheduler.schedulePeriodic(this);
    NotificationMaintenanceScheduler.scheduleImmediate(this);
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
