package com.gonezo.multiplatform.systemui;

import android.app.Activity;
import android.content.res.Configuration;
import android.view.View;
import android.view.Window;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.gonezo.multiplatform.R;

public final class AndroidSystemBarsController {
  private final Activity activity;
  private final Window window;
  private final int surfaceColor;

  private int initialPaddingLeft;
  private int initialPaddingTop;
  private int initialPaddingRight;
  private int initialPaddingBottom;

  public AndroidSystemBarsController(Activity activity) {
    this.activity = activity;
    this.window = activity.getWindow();
    this.surfaceColor = ContextCompat.getColor(activity, R.color.system_bar_surface);
  }

  public void configure(View appShell) {
    WindowCompat.setDecorFitsSystemWindows(window, false);
    applySystemBarColors();
    applySystemBarIcons();
    captureInitialPadding(appShell);
    ViewCompat.setOnApplyWindowInsetsListener(appShell, (view, insets) -> {
      Insets systemBarsAndCutout = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
      );
      Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
      int bottomInset = Math.max(systemBarsAndCutout.bottom, ime.bottom);
      dispatchKeyboardVisibility(appShell, insets.isVisible(WindowInsetsCompat.Type.ime()));
      view.setPadding(
        initialPaddingLeft + systemBarsAndCutout.left,
        initialPaddingTop + systemBarsAndCutout.top,
        initialPaddingRight + systemBarsAndCutout.right,
        initialPaddingBottom + bottomInset
      );
      return WindowInsetsCompat.CONSUMED;
    });
    ViewCompat.requestApplyInsets(appShell);
  }

  private void dispatchKeyboardVisibility(View appShell, boolean visible) {
    String script = "window.dispatchEvent(new CustomEvent('gonezo:keyboard-visibility',{detail:{visible:" + visible + "}}));";
    WebView webView = findWebView(appShell);
    if (webView != null) webView.post(() -> webView.evaluateJavascript(script, null));
  }

  private WebView findWebView(View view) {
    if (view instanceof WebView) return (WebView) view;
    if (!(view instanceof ViewGroup)) return null;
    ViewGroup group = (ViewGroup) view;
    for (int index = 0; index < group.getChildCount(); index += 1) {
      WebView webView = findWebView(group.getChildAt(index));
      if (webView != null) return webView;
    }
    return null;
  }

  private void captureInitialPadding(View appShell) {
    initialPaddingLeft = appShell.getPaddingLeft();
    initialPaddingTop = appShell.getPaddingTop();
    initialPaddingRight = appShell.getPaddingRight();
    initialPaddingBottom = appShell.getPaddingBottom();
  }

  private void applySystemBarColors() {
    window.setStatusBarColor(surfaceColor);
    window.setNavigationBarColor(surfaceColor);
  }

  private void applySystemBarIcons() {
    boolean useDarkIcons = isNightMode();
    WindowInsetsControllerCompat insetsController = WindowCompat.getInsetsController(window, window.getDecorView());
    insetsController.setAppearanceLightStatusBars(!useDarkIcons);
    insetsController.setAppearanceLightNavigationBars(!useDarkIcons);
  }

  private boolean isNightMode() {
    int nightMode = activity.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
    return nightMode == Configuration.UI_MODE_NIGHT_YES;
  }
}
