package com.gonezo.persistence.notifications

import com.gonezo.notifications.application.NotificationListFilter
import com.gonezo.notifications.application.NotificationLookupResult
import com.gonezo.notifications.application.NotificationWriteResult
import com.gonezo.notifications.infrastructure.JdbcNotificationDeliveryQueue
import com.gonezo.notifications.infrastructure.JdbcNotificationRepository
import com.gonezo.notifications.domain.Notification
import com.gonezo.notifications.domain.NotificationId
import com.gonezo.notifications.domain.NotificationSourceType
import com.gonezo.notifications.domain.NotificationType
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class JdbcNotificationPersistenceContractTest : SqliteE2ETest() {
    private val createdAt = Instant.parse("2026-06-10T10:00:00Z")

    @Test
    fun `duplicate creation preserves identity and first read timestamp`() {
        val repository = JdbcNotificationRepository(db.namedJdbcTemplate)
        val first = notification("dedup-key", subject = "First")
        val created = repository.createIfAbsent(first)
        val readAt = Instant.parse("2026-06-10T11:00:00Z")
        repository.markRead("local-user", first.id.toString(), readAt)

        val duplicate = repository.createIfAbsent(notification("dedup-key", subject = "Second"))

        assertThat(created).isInstanceOf(NotificationWriteResult.Created::class.java)
        assertThat(duplicate).isInstanceOf(NotificationWriteResult.Existing::class.java)
        val existing = duplicate as NotificationWriteResult.Existing
        assertThat(existing.row.notification.id).isEqualTo(first.id)
        assertThat(existing.row.notification.subject).isEqualTo("First")
        assertThat(existing.row.notification.readAt).isEqualTo(readAt)
    }

    @Test
    fun `pagination is stable and ordered by descending sequence`() {
        val repository = JdbcNotificationRepository(db.namedJdbcTemplate)
        val notifications = (1..3).map { number -> notification("key-$number", subject = "Subject $number") }
        notifications.forEach(repository::createIfAbsent)

        val firstPage = repository.list("local-user", NotificationListFilter.ALL, beforeSequence = null, limit = 2)
        val secondPage = repository.list("local-user", NotificationListFilter.ALL, beforeSequence = firstPage.nextSequence, limit = 2)

        assertThat(firstPage.items.map { it.notification.subject }).containsExactly("Subject 3", "Subject 2")
        assertThat(secondPage.items.map { it.notification.subject }).containsExactly("Subject 1")
    }

    @Test
    fun `unread count and owner lookup remain isolated`() {
        val repository = JdbcNotificationRepository(db.namedJdbcTemplate)
        repository.createIfAbsent(notification("local-key"))
        val other = notification("other-key", ownerId = "other-user")
        repository.createIfAbsent(other)

        assertThat(repository.countUnread("local-user")).isEqualTo(1)
        assertThat(repository.findById("local-user", other.id.toString()))
            .isEqualTo(NotificationLookupResult.NotFound)
    }

    @Test
    fun `delivery queue is idempotent and cancels only pending delivery`() {
        val notificationRepository = JdbcNotificationRepository(db.namedJdbcTemplate)
        val queue = JdbcNotificationDeliveryQueue(db.namedJdbcTemplate)
        val notification = notification("delivery-key")
        notificationRepository.createIfAbsent(notification)

        queue.enqueueIfAbsent(notification.id.toString())
        queue.enqueueIfAbsent(notification.id.toString())

        assertThat(queue.findEligible(createdAt, 10)).hasSize(1)
        queue.cancel(notification.id.toString())
        assertThat(queue.findEligible(createdAt, 10)).isEmpty()
    }

    @Test
    fun `withdrawal preserves read history and cancels pending delivery`() {
        val repository = JdbcNotificationRepository(db.namedJdbcTemplate)
        val queue = JdbcNotificationDeliveryQueue(db.namedJdbcTemplate)
        val notification = notification("withdraw-key")
        repository.createIfAbsent(notification)
        queue.enqueueIfAbsent(notification.id.toString())
        val readAt = Instant.parse("2026-06-10T11:00:00Z")
        repository.markRead("local-user", notification.id.toString(), readAt)

        val withdrawn = repository.withdraw("local-user", notification.id.toString(), Instant.parse("2026-06-10T12:00:00Z"))

        assertThat(withdrawn).isInstanceOf(NotificationLookupResult.Found::class.java)
        val stored = (withdrawn as NotificationLookupResult.Found).row.notification
        assertThat(stored.readAt).isEqualTo(readAt)
        assertThat(stored.withdrawnAt).isEqualTo(Instant.parse("2026-06-10T12:00:00Z"))
        queue.cancel(notification.id.toString())
        assertThat(queue.findEligible(createdAt, 10)).isEmpty()
    }

    private fun notification(
        deduplicationKey: String,
        subject: String = "Scheduled movement",
        ownerId: String = "local-user",
    ): Notification = Notification.create(
        id = NotificationId.random(),
        ownerId = ownerId,
        type = NotificationType.SCHEDULED_PROCESSING_FAILED,
        deduplicationKey = deduplicationKey,
        sourceType = NotificationSourceType.SCHEDULED,
        sourceId = "scheduled-1",
        originOccurrenceId = UUID.randomUUID().toString(),
        subject = subject,
        errorCode = "LEDGER_POST_FAILED",
        occurredAt = Instant.parse("2026-06-10T09:00:00Z"),
        createdAt = createdAt,
    )
}
