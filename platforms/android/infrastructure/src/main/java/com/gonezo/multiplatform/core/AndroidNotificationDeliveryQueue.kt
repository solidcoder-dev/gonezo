package com.gonezo.multiplatform.core

import android.content.ContentValues
import com.gonezo.notifications.application.NotificationDeliveryQueue
import com.gonezo.notifications.application.PendingNotificationDelivery
import java.time.Instant

internal class AndroidNotificationDeliveryQueue(private val database: CoreDatabase) : NotificationDeliveryQueue {
  override fun enqueueIfAbsent(notificationId: String) {
    database.writableDatabase.insertWithOnConflict(
      "notification_deliveries",
      null,
      ContentValues().apply { put("notification_id", notificationId); put("status", "pending"); put("attempts", 0) },
      android.database.sqlite.SQLiteDatabase.CONFLICT_IGNORE,
    )
  }

  override fun findEligible(now: Instant, limit: Int): List<PendingNotificationDelivery> {
    require(limit > 0) { "limit must be greater than 0" }
    val cursor = database.readableDatabase.query(
      "notification_deliveries",
      arrayOf("notification_id", "attempts", "next_attempt_at"),
      "status = ? and (next_attempt_at is null or next_attempt_at <= ?)",
      arrayOf("pending", now.toString()),
      null,
      null,
      "notification_id asc",
      limit.toString(),
    )
    return cursor.use {
      buildList {
        while (it.moveToNext()) add(PendingNotificationDelivery(it.getString(0), it.getInt(1), it.getString(2)?.let(Instant::parse)))
      }
    }
  }

  override fun markSubmitted(notificationIds: List<String>, submittedAt: Instant) {
    notificationIds.forEach { id ->
      database.writableDatabase.update("notification_deliveries", ContentValues().apply { put("status", "submitted"); put("submitted_at", submittedAt.toString()) }, "notification_id = ? and status = ?", arrayOf(id, "pending"))
    }
  }

  override fun markSuppressed(notificationIds: List<String>, errorCode: String?) {
    notificationIds.forEach { id ->
      database.writableDatabase.update("notification_deliveries", ContentValues().apply { put("status", "suppressed"); putNullable("last_error_code", errorCode) }, "notification_id = ? and status = ?", arrayOf(id, "pending"))
    }
  }

  override fun markRetry(notificationId: String, nextAttemptAt: Instant, errorCode: String?) {
    database.writableDatabase.execSQL(
      "update notification_deliveries set attempts = attempts + 1, next_attempt_at = ?, last_error_code = ? where notification_id = ? and status = 'pending'",
      arrayOf(nextAttemptAt.toString(), errorCode, notificationId),
    )
  }

  override fun cancel(notificationId: String) {
    database.writableDatabase.update("notification_deliveries", ContentValues().apply { put("status", "cancelled") }, "notification_id = ? and status = ?", arrayOf(notificationId, "pending"))
  }

  private fun ContentValues.putNullable(key: String, value: String?) { if (value == null) putNull(key) else put(key, value) }
}
