package com.gonezo.notifications.application

import com.gonezo.notifications.infrastructure.JdbcNotificationDeliveryQueue
import com.gonezo.notifications.infrastructure.JdbcNotificationRepository
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Instant

class RecordScheduledMovementNotificationServiceTest : SqliteE2ETest() {
    @Test
    fun `records one expected notification and delivery for repeated event`() {
        val recorder = RecordScheduledMovementNotificationService(
            ownerId = "local-user",
            notifications = JdbcNotificationRepository(db.namedJdbcTemplate),
            deliveries = JdbcNotificationDeliveryQueue(db.namedJdbcTemplate),
        )
        val event = ScheduledExpectedNotification(
            recurringMovementId = "scheduled-1",
            expectedMovementId = "expected-1",
            originOccurrenceId = "occurrence-1",
            dueAt = Instant.parse("2026-06-10T09:00:00Z"),
            subject = null,
            occurredAt = Instant.parse("2026-06-10T10:00:00Z"),
        )

        recorder.recordExpected(event)
        recorder.recordExpected(event)

        val repository = JdbcNotificationRepository(db.namedJdbcTemplate)
        val page = repository.list("local-user", NotificationListFilter.ALL, null, 10)
        assertThat(page.items).hasSize(1)
        assertThat(page.items.single().notification.subject).isEqualTo("Scheduled movement")
        assertThat(JdbcNotificationDeliveryQueue(db.namedJdbcTemplate).findEligible(event.occurredAt, 10)).hasSize(1)
    }
}
