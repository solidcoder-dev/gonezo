package com.gonezo.notifications.application

import com.gonezo.notifications.domain.Notification
import com.gonezo.notifications.domain.NotificationId
import com.gonezo.notifications.domain.NotificationSourceType
import com.gonezo.notifications.domain.NotificationType
import com.gonezo.notifications.infrastructure.JdbcNotificationRepository
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant

class NotificationQueriesTest : SqliteE2ETest() {
    private val createdAt = Instant.parse("2026-06-10T10:00:00Z")

    @Test
    fun `lists unread items with opaque snapshot and next cursors`() {
        val repository = JdbcNotificationRepository(db.namedJdbcTemplate)
        repository.createIfAbsent(notification("first", "First"))
        repository.createIfAbsent(notification("second", "Second"))
        val queries = NotificationQueries(repository)

        val result = queries.notificationsList("local-user", NotificationsListQuery(filter = "unread", limit = 1))

        assertThat(result.items.map { it.subject }).containsExactly("Second")
        assertThat(result.nextCursor).startsWith("sequence:")
        assertThat(result.snapshotCursor).startsWith("sequence:")
        assertThat(result.nextCursor).doesNotContain("2026")
    }

    @Test
    fun `mark all read stops at captured snapshot and keeps later arrival unread`() {
        val repository = JdbcNotificationRepository(db.namedJdbcTemplate)
        val first = notification("first", "First")
        repository.createIfAbsent(first)
        val queries = NotificationQueries(repository)
        val snapshot = queries.notificationsList("local-user", NotificationsListQuery(filter = "all")).snapshotCursor!!
        val later = notification("later", "Later")
        repository.createIfAbsent(later)

        assertThat(queries.notificationsMarkAllRead("local-user", snapshot, Instant.parse("2026-06-10T11:00:00Z"))).isEqualTo(1)
        assertThat(queries.notificationsCountUnread("local-user")).isEqualTo(1)
        assertThat(queries.notificationsMarkRead("local-user", "missing", createdAt))
            .isEqualTo(NotificationCommandResult.NotFound)
    }

    @Test
    fun `rejects invalid filters and cursors`() {
        val queries = NotificationQueries(JdbcNotificationRepository(db.namedJdbcTemplate))

        assertThatThrownBy {
            queries.notificationsList("local-user", NotificationsListQuery(filter = "active"))
        }.isInstanceOf(IllegalStateException::class.java)
        assertThatThrownBy {
            queries.notificationsMarkAllRead("local-user", "not-a-cursor", createdAt)
        }.isInstanceOf(IllegalArgumentException::class.java)
    }

    private fun notification(key: String, subject: String): Notification = Notification.create(
        id = NotificationId.random(),
        ownerId = "local-user",
        type = NotificationType.SCHEDULED_PROCESSING_FAILED,
        deduplicationKey = key,
        sourceType = NotificationSourceType.SCHEDULED,
        sourceId = "scheduled-1",
        originOccurrenceId = key,
        subject = subject,
        errorCode = "LEDGER_POST_FAILED",
        occurredAt = createdAt,
        createdAt = createdAt,
    )
}
