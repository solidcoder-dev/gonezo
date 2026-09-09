package com.gonezo.multiplatform.infrastructure.notifications

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import com.gonezo.notifications.application.SystemNotificationResult
import com.gonezo.notifications.application.SystemNotificationSender
import com.gonezo.multiplatform.R

enum class AndroidNotificationPermissionState {
  GRANTED,
  DENIED,
  CHANNEL_BLOCKED,
}

class AndroidNotificationSystemSender(
  private val context: Context,
  private val openNotificationsIntent: PendingIntent,
) : SystemNotificationSender {
  private val manager: NotificationManagerCompat = NotificationManagerCompat.from(context)

  override fun updateSummary(unreadCount: Int): SystemNotificationResult {
    ensureChannel()
    return when (permissionState()) {
      AndroidNotificationPermissionState.GRANTED -> runCatching {
        manager.notify(TAG, SUMMARY_ID, summary(unreadCount))
        SystemNotificationResult.Accepted
      }.getOrElse { SystemNotificationResult.Failed("SYSTEM_NOTIFICATION_ERROR") }
      AndroidNotificationPermissionState.DENIED,
      AndroidNotificationPermissionState.CHANNEL_BLOCKED -> SystemNotificationResult.Suppressed("NOTIFICATIONS_BLOCKED")
    }
  }

  override fun removeSummary() {
    manager.cancel(TAG, SUMMARY_ID)
  }

  override fun summaryExists(): Boolean = manager.activeNotifications.any {
    it.tag == TAG && it.id == SUMMARY_ID
  }

  fun permissionState(): AndroidNotificationPermissionState {
    if (!manager.areNotificationsEnabled()) return AndroidNotificationPermissionState.DENIED
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
      manager.getNotificationChannel(CHANNEL_ID)?.importance == NotificationManager.IMPORTANCE_NONE
    ) return AndroidNotificationPermissionState.CHANNEL_BLOCKED
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) return AndroidNotificationPermissionState.DENIED
    return AndroidNotificationPermissionState.GRANTED
  }

  fun requestPermission(activity: android.app.Activity, requestCode: Int) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), requestCode)
    }
  }

  fun openSettings() {
    context.startActivity(Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
      putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    })
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channels = context.getSystemService(NotificationManager::class.java)
    if (channels.getNotificationChannel(CHANNEL_ID) != null) return
    channels.createNotificationChannel(NotificationChannel(CHANNEL_ID, context.getString(R.string.notifications_channel_name), NotificationManager.IMPORTANCE_LOW).apply {
      setSound(null, null)
      enableVibration(false)
    })
  }

  private fun summary(unreadCount: Int): Notification = Notification.Builder(context, CHANNEL_ID)
    .setSmallIcon(android.R.drawable.ic_dialog_info)
    .setContentTitle(context.getString(R.string.app_name))
    .setContentText(context.resources.getQuantityString(R.plurals.unread_notifications, unreadCount, unreadCount))
    .setContentIntent(openNotificationsIntent)
    .setOnlyAlertOnce(true)
    .setAutoCancel(true)
    .build()

  companion object {
    const val CHANNEL_ID = "gonezo_notifications"
    const val TAG = "gonezo.notifications.summary"
    const val SUMMARY_ID = 1
  }
}
