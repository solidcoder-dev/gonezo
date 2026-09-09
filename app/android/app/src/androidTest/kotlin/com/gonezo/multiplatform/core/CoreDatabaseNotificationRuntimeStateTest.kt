package com.gonezo.multiplatform.core

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.gonezo.notifications.application.NotificationDeliveryQueue
import com.gonezo.notifications.application.NotificationRepository
import com.gonezo.notifications.domain.Notification
import com.gonezo.notifications.domain.NotificationId
import com.gonezo.notifications.domain.NotificationSourceType
import com.gonezo.notifications.domain.NotificationType
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant

@RunWith(AndroidJUnit4::class)
class CoreDatabaseNotificationRuntimeStateTest {
  private lateinit var database: CoreDatabase
  private lateinit var context: Context

  @Before
  fun setUp() {
    context = ApplicationProvider.getApplicationContext()
    database = CoreDatabase(context, "gonezo-notification-runtime-${System.nanoTime()}.db")
  }

  @After
  fun tearDown() {
    database.close()
    context.deleteDatabase(database.databaseName)
  }

  @Test
  fun clearPortableStateRemovesNotificationsAndDeliveries() {
    val repository: NotificationRepository = AndroidNotificationRepository(database)
    val queue: NotificationDeliveryQueue = AndroidNotificationDeliveryQueue(database)
    val notification = Notification.create(
      id = NotificationId.random(), ownerId = "local-user", type = NotificationType.SCHEDULED_PROCESSING_FAILED,
      deduplicationKey = "restore", sourceType = NotificationSourceType.SCHEDULED, sourceId = "scheduled-1",
      originOccurrenceId = "occurrence-1", subject = "Scheduled movement", errorCode = "PROCESSING_FAILED",
      occurredAt = Instant.parse("2026-06-10T10:00:00Z"), createdAt = Instant.parse("2026-06-10T10:00:00Z"),
    )
    repository.createIfAbsent(notification)
    queue.enqueueIfAbsent(notification.id.toString())

    database.clearPortableState()

    assertEquals(0, database.readableDatabase.query("notifications", null, null, null, null, null, null).use { it.count })
    assertEquals(0, database.readableDatabase.query("notification_deliveries", null, null, null, null, null, null).use { it.count })
  }
}
