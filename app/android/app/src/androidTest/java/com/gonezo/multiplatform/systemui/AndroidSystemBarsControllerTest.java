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
          .build();

        ViewCompat.dispatchApplyWindowInsets(root, insets);
        ViewCompat.dispatchApplyWindowInsets(root, insets);

        assertEquals(12, root.getPaddingLeft());
        assertEquals(20, root.getPaddingTop());
        assertEquals(16, root.getPaddingRight());
        assertEquals(28, root.getPaddingBottom());
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
  public void mainActivityResolvesAnAppShellRoot() {
    try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
      scenario.onActivity(activity -> assertNotNull(activity.findViewById(R.id.app_shell)));
    }
  }
}
