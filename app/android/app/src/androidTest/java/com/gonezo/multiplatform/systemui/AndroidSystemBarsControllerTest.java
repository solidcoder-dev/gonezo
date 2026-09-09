package com.gonezo.multiplatform.systemui;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import android.view.View;
import android.widget.FrameLayout;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import com.gonezo.multiplatform.MainActivity;
import com.gonezo.multiplatform.R;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class AndroidSystemBarsControllerTest {
  @Test
  public void preservesInitialPaddingAndConsumesInsetsOnce() {
    try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
      scenario.onActivity(activity -> {
        FrameLayout root = new FrameLayout(activity);
        root.setPadding(12, 14, 16, 18);

        View child = new View(activity);
        AtomicInteger childInsetsCalls = new AtomicInteger();
        ViewCompat.setOnApplyWindowInsetsListener(child, (view, insets) -> {
          childInsetsCalls.incrementAndGet();
          return insets;
        });
        root.addView(child);

        activity.setContentView(root);
        new AndroidSystemBarsController(activity).configure(root);

        WindowInsetsCompat insets = new WindowInsetsCompat.Builder()
          .setInsets(WindowInsetsCompat.Type.statusBars(), Insets.of(0, 6, 0, 0))
          .setInsets(WindowInsetsCompat.Type.navigationBars(), Insets.of(0, 0, 0, 10))
          .setInsets(WindowInsetsCompat.Type.ime(), Insets.of(0, 0, 0, 300))
          .setVisible(WindowInsetsCompat.Type.ime(), true)
          .build();

        ViewCompat.dispatchApplyWindowInsets(root, insets);
        ViewCompat.dispatchApplyWindowInsets(root, insets);

        assertEquals(12, root.getPaddingLeft());
        assertEquals(20, root.getPaddingTop());
        assertEquals(16, root.getPaddingRight());
        assertEquals(318, root.getPaddingBottom());
        assertEquals(0, childInsetsCalls.get());
      });
    }
  }

  @Test
  public void appliesSystemBarsAndDisplayCutoutInsets() {
    try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
      scenario.onActivity(activity -> {
        FrameLayout root = new FrameLayout(activity);
        activity.setContentView(root);

        new AndroidSystemBarsController(activity).configure(root);

        WindowInsetsCompat insets = new WindowInsetsCompat.Builder()
          .setInsets(WindowInsetsCompat.Type.systemBars(), Insets.of(2, 4, 6, 8))
          .setInsets(WindowInsetsCompat.Type.displayCutout(), Insets.of(10, 12, 14, 16))
          .setInsets(WindowInsetsCompat.Type.ime(), Insets.NONE)
          .setVisible(WindowInsetsCompat.Type.ime(), false)
          .build();

        ViewCompat.dispatchApplyWindowInsets(root, insets);

        assertEquals(10, root.getPaddingLeft());
        assertEquals(12, root.getPaddingTop());
        assertEquals(14, root.getPaddingRight());
        assertEquals(16, root.getPaddingBottom());
      });
    }
  }

  @Test
  public void restoresInitialBottomPaddingWhenKeyboardCloses() {
    try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
      scenario.onActivity(activity -> {
        FrameLayout root = new FrameLayout(activity);
        root.setPadding(12, 14, 16, 18);
        activity.setContentView(root);

        new AndroidSystemBarsController(activity).configure(root);

        WindowInsetsCompat keyboardOpen = new WindowInsetsCompat.Builder()
          .setInsets(WindowInsetsCompat.Type.navigationBars(), Insets.of(0, 0, 0, 10))
          .setInsets(WindowInsetsCompat.Type.ime(), Insets.of(0, 0, 0, 300))
          .setVisible(WindowInsetsCompat.Type.ime(), true)
          .build();
        WindowInsetsCompat keyboardClosed = new WindowInsetsCompat.Builder()
          .setInsets(WindowInsetsCompat.Type.navigationBars(), Insets.of(0, 0, 0, 10))
          .setInsets(WindowInsetsCompat.Type.ime(), Insets.NONE)
          .setVisible(WindowInsetsCompat.Type.ime(), false)
          .build();

        ViewCompat.dispatchApplyWindowInsets(root, keyboardOpen);
        assertEquals(318, root.getPaddingBottom());

        ViewCompat.dispatchApplyWindowInsets(root, keyboardClosed);
        assertEquals(28, root.getPaddingBottom());
      });
    }
  }

  @Test
  public void updatesBottomPaddingWhenKeyboardHeightChanges() {
    try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
      scenario.onActivity(activity -> {
        FrameLayout root = new FrameLayout(activity);
        root.setPadding(12, 14, 16, 18);
        activity.setContentView(root);

        new AndroidSystemBarsController(activity).configure(root);

        WindowInsetsCompat keyboardAtInitialHeight = new WindowInsetsCompat.Builder()
          .setInsets(WindowInsetsCompat.Type.navigationBars(), Insets.of(0, 0, 0, 10))
          .setInsets(WindowInsetsCompat.Type.ime(), Insets.of(0, 0, 0, 300))
          .setVisible(WindowInsetsCompat.Type.ime(), true)
          .build();
        WindowInsetsCompat keyboardAtExpandedHeight = new WindowInsetsCompat.Builder()
          .setInsets(WindowInsetsCompat.Type.navigationBars(), Insets.of(0, 0, 0, 10))
          .setInsets(WindowInsetsCompat.Type.ime(), Insets.of(0, 0, 0, 420))
          .setVisible(WindowInsetsCompat.Type.ime(), true)
          .build();

        ViewCompat.dispatchApplyWindowInsets(root, keyboardAtInitialHeight);
        assertEquals(318, root.getPaddingBottom());

        ViewCompat.dispatchApplyWindowInsets(root, keyboardAtExpandedHeight);
        assertEquals(438, root.getPaddingBottom());
      });
    }
  }

  @Test
  public void keepsSystemBottomInsetWhenKeyboardIsShorter() {
    try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
      scenario.onActivity(activity -> {
        FrameLayout root = new FrameLayout(activity);
        root.setPadding(12, 14, 16, 18);
        activity.setContentView(root);

        new AndroidSystemBarsController(activity).configure(root);

        WindowInsetsCompat insets = new WindowInsetsCompat.Builder()
          .setInsets(WindowInsetsCompat.Type.navigationBars(), Insets.of(0, 0, 0, 24))
          .setInsets(WindowInsetsCompat.Type.ime(), Insets.of(0, 0, 0, 10))
          .setVisible(WindowInsetsCompat.Type.ime(), true)
          .build();

        ViewCompat.dispatchApplyWindowInsets(root, insets);

        assertEquals(42, root.getPaddingBottom());
      });
    }
  }

  @Test
  public void mainActivityResolvesAnAppShellRoot() {
    try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
      scenario.onActivity(activity -> assertNotNull(activity.findViewById(R.id.app_shell)));
    }
  }
}
