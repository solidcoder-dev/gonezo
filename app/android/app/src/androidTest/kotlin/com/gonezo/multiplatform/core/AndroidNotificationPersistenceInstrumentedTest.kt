package com.gonezo.multiplatform.core

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.gonezo.notifications.application.NotificationListFilter
import com.gonezo.notifications.application.NotificationWriteResult
import com.gonezo.notifications.domain.Notification
import com.gonezo.notifications.domain.NotificationId
import com.gonezo.notifications.domain.NotificationSourceType
import com.gonezo.notifications.domain.NotificationType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class AndroidNotificationPersistenceInstrumentedTest {
  @Test
  fun duplicateReadAndPaginationPreserveTheInboxContract() {
    val database = CoreDatabase(ApplicationProvider.getApplicationContext(), "gonezo-notifications-${System.nanoTime()}.db")
    val repository = AndroidNotificationRepository(database)
    val first = notification("key-1", "First")
    val second = notification("key-2", "Second")
    val third = notification("key-3", "Third")
    repository.createIfAbsent(first)
    repository.createIfAbsent(second)
    repository.createIfAbsent(third)
    val readAt = Instant.parse("2026-06-10T11:00:00Z")
    repository.markRead("local-user", first.id.toString(), readAt)

    val duplicate = repository.createIfAbsent(notification("key-1", "Replacement"))
    val page = repository.list("local-user", NotificationListFilter.ALL, null, 2)

    assertTrue(duplicate is NotificationWriteResult.Existing)
    val existing = duplicate as NotificationWriteResult.Existing
    assertEquals(first.id, existing.row.notification.id)
    assertEquals(readAt, existing.row.notification.readAt)
    assertEquals(listOf("Third", "Second"), page.items.map { it.notification.subject })
    assertEquals(2, repository.countUnread("local-user"))
    database.close()
  }

  private fun notification(key: String, subject: String): Notification = Notification.create(
    id = NotificationId.random(),
    ownerId = "local-user",
    type = NotificationType.SCHEDULED_PROCESSING_FAILED,
    deduplicationKey = key,
    sourceType = NotificationSourceType.SCHEDULED,
    sourceId = "scheduled-1",
    originOccurrenceId = UUID.randomUUID().toString(),
    subject = subject,
    errorCode = "LEDGER_POST_FAILED",
    occurredAt = Instant.parse("2026-06-10T09:00:00Z"),
    createdAt = Instant.parse("2026-06-10T10:00:00Z"),
  )
}
