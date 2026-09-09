package com.gonezo.notifications.application

import com.gonezo.notifications.domain.Notification
import com.gonezo.notifications.domain.NotificationId
import com.gonezo.notifications.domain.NotificationSourceType
import com.gonezo.notifications.domain.NotificationType
import com.gonezo.notifications.infrastructure.JdbcNotificationDeliveryQueue
import com.gonezo.notifications.infrastructure.JdbcNotificationRepository
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Instant

class DeliverPendingNotificationsServiceTest : SqliteE2ETest() {
    private val now = Instant.parse("2026-06-10T10:00:00Z")

    @Test
    fun `groups ten pending events into one accepted summary`() {
        val repository = JdbcNotificationRepository(db.namedJdbcTemplate)
        val queue = JdbcNotificationDeliveryQueue(db.namedJdbcTemplate)
        val sender = FakeSender(SystemNotificationResult.Accepted)
        repeat(10) { number ->
            val notification = notification("event-$number")
            repository.createIfAbsent(notification)
            queue.enqueueIfAbsent(notification.id.toString())
        }

        val result = DeliverPendingNotificationsService(repository, queue, sender).execute("local-user", now)

        assertThat(result.submitted).isEqualTo(10)
        assertThat(sender.updateCalls).containsExactly(10)
        assertThat(queue.findEligible(now, 20)).isEmpty()
    }

    @Test
    fun `suppressed permission consumes current deliveries without retry`() {
        val repository = JdbcNotificationRepository(db.namedJdbcTemplate)
        val queue = JdbcNotificationDeliveryQueue(db.namedJdbcTemplate)
        val sender = FakeSender(SystemNotificationResult.Suppressed("PERMISSION_DENIED"))
        val notification = notification("permission")
        repository.createIfAbsent(notification)
        queue.enqueueIfAbsent(notification.id.toString())

        val result = DeliverPendingNotificationsService(repository, queue, sender).execute("local-user", now)

        assertThat(result.suppressed).isEqualTo(1)
        assertThat(queue.findEligible(now, 20)).isEmpty()
    }

    @Test
    fun `failed delivery schedules exponential retry while retained notification can be retried`() {
        val repository = JdbcNotificationRepository(db.namedJdbcTemplate)
        val queue = JdbcNotificationDeliveryQueue(db.namedJdbcTemplate)
        val sender = FakeSender(SystemNotificationResult.Failed("SYSTEM_ERROR"))
        val notification = notification("retry")
        repository.createIfAbsent(notification)
        queue.enqueueIfAbsent(notification.id.toString())

        val result = DeliverPendingNotificationsService(repository, queue, sender).execute("local-user", now)

        assertThat(result.retried).isEqualTo(1)
        assertThat(queue.findEligible(now.plusSeconds(59), 20)).isEmpty()
        assertThat(queue.findEligible(now.plusSeconds(60), 20)).hasSize(1)
    }

    @Test
    fun `does not recreate a discarded summary without a new eligible event`() {
        val repository = JdbcNotificationRepository(db.namedJdbcTemplate)
        val queue = JdbcNotificationDeliveryQueue(db.namedJdbcTemplate)
        val sender = FakeSender(SystemNotificationResult.Accepted, exists = false)
        val notification = notification("read")
        repository.createIfAbsent(notification)
        repository.markRead("local-user", notification.id.toString(), now)
        queue.enqueueIfAbsent(notification.id.toString())

        DeliverPendingNotificationsService(repository, queue, sender).execute("local-user", now)

        assertThat(sender.updateCalls).isEmpty()
        assertThat(sender.removeCalls).isEqualTo(1)
    }

    private fun notification(key: String): Notification = Notification.create(
        id = NotificationId.random(), ownerId = "local-user",
        type = NotificationType.SCHEDULED_PROCESSING_FAILED,
        deduplicationKey = key, sourceType = NotificationSourceType.SCHEDULED,
        sourceId = "scheduled-1", originOccurrenceId = key,
        subject = "Scheduled movement", errorCode = "PROCESSING_FAILED",
        occurredAt = now, createdAt = now,
    )

    private class FakeSender(
        private val outcome: SystemNotificationResult,
        private val exists: Boolean = true,
    ) : SystemNotificationSender {
        val updateCalls = mutableListOf<Int>()
        var removeCalls = 0

        override fun updateSummary(unreadCount: Int): SystemNotificationResult {
            updateCalls += unreadCount
            return outcome
        }

        override fun removeSummary() {
            removeCalls += 1
        }

        override fun summaryExists(): Boolean = exists
    }
}
