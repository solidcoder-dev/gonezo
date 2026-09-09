package com.gonezo.notifications.domain

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class NotificationTest {
    private val createdAt = Instant.parse("2026-06-10T10:00:00Z")
    private val occurredAt = Instant.parse("2026-06-10T09:00:00Z")

    @Test
    fun `creates an unread confirmation notification with valid references`() {
        val notification = Notification.create(
            id = NotificationId.random(),
            ownerId = "local-user",
            type = NotificationType.SCHEDULED_CONFIRMATION_REQUIRED,
            deduplicationKey = "scheduled_confirmation_required/scheduled-1/2026-06-10T09:00:00.000Z",
            sourceType = NotificationSourceType.EXPECTED,
            sourceId = "expected-1",
            originOccurrenceId = UUID.randomUUID().toString(),
            subject = "Coffee",
            errorCode = null,
            occurredAt = occurredAt,
            createdAt = createdAt,
        )

        assertThat(notification.readAt).isNull()
        assertThat(notification.withdrawnAt).isNull()
        assertThat(notification.isUnreadActive).isTrue()
        assertThat(notification.sourceId).isEqualTo("expected-1")
    }

    @Test
    fun `marking read repeatedly preserves the first timestamp`() {
        val notification = confirmation()
        val firstReadAt = Instant.parse("2026-06-10T11:00:00Z")

        val first = notification.markRead(firstReadAt)
        val second = first.markRead(Instant.parse("2026-06-10T12:00:00Z"))

        assertThat(first.readAt).isEqualTo(firstReadAt)
        assertThat(second.readAt).isEqualTo(firstReadAt)
        assertThat(second.isUnreadActive).isFalse()
    }

    @Test
    fun `withdrawing is independent from reading`() {
        val notification = confirmation()
        val withdrawn = notification.withdraw(Instant.parse("2026-06-10T11:00:00Z"))

        assertThat(withdrawn.readAt).isNull()
        assertThat(withdrawn.withdrawnAt).isEqualTo(Instant.parse("2026-06-10T11:00:00Z"))
        assertThat(withdrawn.isUnreadActive).isFalse()
    }

    @Test
    fun `rehydrates a withdrawn and read notification without creating a new event`() {
        val readAt = Instant.parse("2026-06-10T11:00:00Z")
        val withdrawnAt = Instant.parse("2026-06-10T12:00:00Z")

        val notification = Notification.rehydrate(
            id = NotificationId.random(),
            ownerId = "local-user",
            type = NotificationType.SCHEDULED_PROCESSING_FAILED,
            deduplicationKey = "scheduled_processing_failed/scheduled-1/2026-06-10T09:00:00.000Z",
            sourceType = NotificationSourceType.SCHEDULED,
            sourceId = "scheduled-1",
            originOccurrenceId = UUID.randomUUID().toString(),
            subject = "Scheduled movement",
            errorCode = "LEDGER_POST_FAILED",
            occurredAt = occurredAt,
            createdAt = createdAt,
            readAt = readAt,
            withdrawnAt = withdrawnAt,
        )

        assertThat(notification.readAt).isEqualTo(readAt)
        assertThat(notification.withdrawnAt).isEqualTo(withdrawnAt)
    }

    @Test
    fun `rejects incompatible type and source references`() {
        assertThatThrownBy {
            Notification.create(
                id = NotificationId.random(),
                ownerId = "local-user",
                type = NotificationType.SCHEDULED_CONFIRMATION_REQUIRED,
                deduplicationKey = "key",
                sourceType = NotificationSourceType.SCHEDULED,
                sourceId = "scheduled-1",
                originOccurrenceId = UUID.randomUUID().toString(),
                subject = "Coffee",
                errorCode = null,
                occurredAt = occurredAt,
                createdAt = createdAt,
            )
        }.isInstanceOf(IllegalArgumentException::class.java)
    }

    private fun confirmation(): Notification = Notification.create(
        id = NotificationId.random(),
        ownerId = "local-user",
        type = NotificationType.SCHEDULED_CONFIRMATION_REQUIRED,
        deduplicationKey = "scheduled_confirmation_required/scheduled-1/2026-06-10T09:00:00.000Z",
        sourceType = NotificationSourceType.EXPECTED,
        sourceId = "expected-1",
        originOccurrenceId = UUID.randomUUID().toString(),
        subject = "Coffee",
        errorCode = null,
        occurredAt = occurredAt,
        createdAt = createdAt,
    )
}
