package com.gonezo.multiplatform.notifications

import android.app.PendingIntent
import android.content.Intent
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.gonezo.multiplatform.MainActivity
import com.gonezo.multiplatform.core.AndroidNotificationMaintenanceRuntime
import com.gonezo.multiplatform.core.AndroidScheduledProcessingRuntime
import java.time.Instant

class NotificationMaintenanceWorker(
  appContext: android.content.Context,
  workerParams: WorkerParameters,
) : CoroutineWorker(appContext, workerParams) {
  override suspend fun doWork(): Result {
    val now = Instant.now()
    val processingFailed = runCatching {
      AndroidScheduledProcessingRuntime.getInstance(applicationContext).processDue(now)
    }.isFailure

    val deliveryFailed = runCatching {
      val intent = NotificationIntentContract.openNotificationsIntent(Intent(applicationContext, MainActivity::class.java))
      val openNotifications = PendingIntent.getActivity(
        applicationContext,
        REQUEST_CODE,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      AndroidNotificationMaintenanceRuntime.create(applicationContext).deliver(now, openNotifications)
    }.isFailure

    return if (processingFailed || deliveryFailed) Result.retry() else Result.success()
  }

  private companion object {
    const val REQUEST_CODE = 7001
  }
}
