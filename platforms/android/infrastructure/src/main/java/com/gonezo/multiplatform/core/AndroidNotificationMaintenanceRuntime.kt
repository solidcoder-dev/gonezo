package com.gonezo.multiplatform.core

import android.app.PendingIntent
import android.content.Context
import com.gonezo.multiplatform.infrastructure.notifications.AndroidNotificationSystemSender
import com.gonezo.notifications.application.DeliverPendingNotificationsService
import java.time.Instant

class AndroidNotificationMaintenanceRuntime private constructor(
  private val database: CoreDatabase,
  private val context: Context,
) {
  fun deliver(now: Instant, openNotificationsIntent: PendingIntent) {
    DeliverPendingNotificationsService(
      notifications = AndroidNotificationRepository(database),
      deliveries = AndroidNotificationDeliveryQueue(database),
      sender = AndroidNotificationSystemSender(context, openNotificationsIntent),
    ).execute("local-user", now)
  }

  companion object {
    fun create(context: Context): AndroidNotificationMaintenanceRuntime = AndroidNotificationMaintenanceRuntime(
      database = CoreDatabase(context.applicationContext),
      context = context.applicationContext,
    )
  }
}
