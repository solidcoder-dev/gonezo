package com.gonezo.multiplatform.infrastructure.notifications

import android.Manifest
import android.app.Activity
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat

class AndroidNotificationPermissionController(private val context: Context) {
  fun state(): AndroidNotificationPermissionState {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return AndroidNotificationPermissionState.DENIED
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.getNotificationChannel(AndroidNotificationSystemSender.CHANNEL_ID)?.importance == NotificationManager.IMPORTANCE_NONE) {
      return AndroidNotificationPermissionState.CHANNEL_BLOCKED
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      return AndroidNotificationPermissionState.DENIED
    }
    return AndroidNotificationPermissionState.GRANTED
  }

  fun request(activity: Activity, requestCode: Int) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), requestCode)
  }

  fun openSettings() {
    context.startActivity(Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
      putExtra(android.provider.Settings.EXTRA_APP_PACKAGE, context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    })
  }
}
