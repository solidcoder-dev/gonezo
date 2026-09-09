package com.gonezo.multiplatform.notifications;

import android.content.Intent;

public final class NotificationIntentContract {
  public static final String OPEN_NOTIFICATIONS = "gonezo.open_notifications";

  private NotificationIntentContract() {}

  public static Intent openNotificationsIntent(Intent intent) {
    return intent.putExtra(OPEN_NOTIFICATIONS, true);
  }

  public static boolean requestsInbox(Intent intent) {
    return intent != null && intent.getBooleanExtra(OPEN_NOTIFICATIONS, false);
  }
}
