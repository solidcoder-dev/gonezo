package com.gonezo.multiplatform.notifications

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object NotificationMaintenanceScheduler {
  const val PERIODIC_WORK_NAME = "gonezo-notifications-maintenance"
  private const val IMMEDIATE_WORK_NAME = "gonezo-notifications-maintenance-now"

  @JvmStatic
  fun schedulePeriodic(context: Context) {
    val request = PeriodicWorkRequestBuilder<NotificationMaintenanceWorker>(15, TimeUnit.MINUTES).build()
    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
      PERIODIC_WORK_NAME,
      ExistingPeriodicWorkPolicy.KEEP,
      request,
    )
  }

  @JvmStatic
  fun scheduleImmediate(context: Context) {
    WorkManager.getInstance(context).enqueueUniqueWork(
      IMMEDIATE_WORK_NAME,
      ExistingWorkPolicy.KEEP,
      OneTimeWorkRequestBuilder<NotificationMaintenanceWorker>().build(),
    )
  }
}
