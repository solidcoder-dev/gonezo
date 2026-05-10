package com.gonezo.multiplatform;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import com.gonezo.multiplatform.plugins.CorePlugin;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
  private int lastInsetTop = -1;
  private int lastInsetRight = -1;
  private int lastInsetBottom = -1;
  private int lastInsetLeft = -1;
  private int lastNavigationBottom = -1;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(CorePlugin.class);
    super.onCreate(savedInstanceState);
    installAndroidSafeAreaInsets();
  }

  private void installAndroidSafeAreaInsets() {
    WebView webView = getBridge().getWebView();
    View insetTarget = webView.getParent() instanceof View ? (View) webView.getParent() : webView;

    ViewCompat.setOnApplyWindowInsetsListener(insetTarget, (view, insets) -> {
      Insets safeArea = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
      );
      Insets navigationBars = insets.getInsets(WindowInsetsCompat.Type.navigationBars());
      injectSafeAreaCss(webView, safeArea, navigationBars);
      return insets;
    });

    getBridge().addWebViewListener(new WebViewListener() {
      @Override
      public void onPageCommitVisible(WebView view, String url) {
        clearCachedInsets();
        ViewCompat.requestApplyInsets(insetTarget);
      }

      @Override
      public void onPageLoaded(WebView view) {
        clearCachedInsets();
        ViewCompat.requestApplyInsets(insetTarget);
      }
    });

    ViewCompat.requestApplyInsets(insetTarget);
  }

  private void clearCachedInsets() {
    lastInsetTop = -1;
    lastInsetRight = -1;
    lastInsetBottom = -1;
    lastInsetLeft = -1;
    lastNavigationBottom = -1;
  }

  private void injectSafeAreaCss(WebView webView, Insets safeArea, Insets navigationBars) {
    float density = getResources().getDisplayMetrics().density;
    int top = Math.round(safeArea.top / density);
    int right = Math.round(safeArea.right / density);
    int bottom = Math.round(safeArea.bottom / density);
    int left = Math.round(safeArea.left / density);
    int navigationBottom = Math.round(navigationBars.bottom / density);

    if (
      top == lastInsetTop
        && right == lastInsetRight
        && bottom == lastInsetBottom
        && left == lastInsetLeft
        && navigationBottom == lastNavigationBottom
    ) {
      return;
    }

    lastInsetTop = top;
    lastInsetRight = right;
    lastInsetBottom = bottom;
    lastInsetLeft = left;
    lastNavigationBottom = navigationBottom;

    String script = String.format(
      Locale.US,
      "try{"
        + "var root=document.documentElement;"
        + "root.style.setProperty('--android-safe-area-top','%dpx');"
        + "root.style.setProperty('--android-safe-area-right','%dpx');"
        + "root.style.setProperty('--android-safe-area-bottom','%dpx');"
        + "root.style.setProperty('--android-safe-area-left','%dpx');"
        + "root.style.setProperty('--android-navigation-bar-bottom','%dpx');"
        + "}catch(e){}",
      top,
      right,
      bottom,
      left,
      navigationBottom
    );

    webView.post(() -> webView.evaluateJavascript(script, null));
  }
}
