package com.gonezo.notifications.application

import com.gonezo.notifications.domain.Notification
import com.gonezo.notifications.domain.NotificationId
import com.gonezo.notifications.domain.NotificationSourceType
import com.gonezo.notifications.domain.NotificationType
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

data class ScheduledExpectedNotification(
    val recurringMovementId: String,
    val expectedMovementId: String,
    val originOccurrenceId: String,
    val dueAt: Instant,
    val subject: String?,
    val occurredAt: Instant,
)

data class ScheduledFailureNotification(
    val recurringMovementId: String,
    val originOccurrenceId: String,
    val dueAt: Instant,
    val subject: String?,
    val errorCode: String,
    val occurredAt: Instant,
)

interface ScheduledMovementNotificationRecorder {
    fun recordExpected(event: ScheduledExpectedNotification)

    fun recordFailure(event: ScheduledFailureNotification)
}

class RecordScheduledMovementNotificationService(
    private val ownerId: String,
    private val notifications: NotificationRepository,
    private val deliveries: NotificationDeliveryQueue,
) : ScheduledMovementNotificationRecorder {
    override fun recordExpected(event: ScheduledExpectedNotification) {
        record(
            type = NotificationType.SCHEDULED_CONFIRMATION_REQUIRED,
            sourceType = NotificationSourceType.EXPECTED,
            sourceId = event.expectedMovementId,
            recurringMovementId = event.recurringMovementId,
            originOccurrenceId = event.originOccurrenceId,
            dueAt = event.dueAt,
            subject = event.subject,
            errorCode = null,
            occurredAt = event.occurredAt,
        )
    }

    override fun recordFailure(event: ScheduledFailureNotification) {
        record(
            type = NotificationType.SCHEDULED_PROCESSING_FAILED,
            sourceType = NotificationSourceType.SCHEDULED,
            sourceId = event.recurringMovementId,
            recurringMovementId = event.recurringMovementId,
            originOccurrenceId = event.originOccurrenceId,
            dueAt = event.dueAt,
            subject = event.subject,
            errorCode = event.errorCode,
            occurredAt = event.occurredAt,
        )
    }

    private fun record(
        type: NotificationType,
        sourceType: NotificationSourceType,
        sourceId: String,
        recurringMovementId: String,
        originOccurrenceId: String,
        dueAt: Instant,
        subject: String?,
        errorCode: String?,
        occurredAt: Instant,
    ) {
        val notification = Notification.create(
            id = NotificationId.random(),
            ownerId = ownerId,
            type = type,
            deduplicationKey = "${type.value}/$recurringMovementId/${dueAt.asNotificationInstant()}",
            sourceType = sourceType,
            sourceId = sourceId,
            originOccurrenceId = originOccurrenceId,
            subject = subject?.trim()?.ifBlank { "Scheduled movement" } ?: "Scheduled movement",
            errorCode = errorCode,
            occurredAt = occurredAt,
            createdAt = occurredAt,
        )
        when (val result = notifications.createIfAbsent(notification)) {
            is NotificationWriteResult.Created -> deliveries.enqueueIfAbsent(result.row.notification.id.toString())
            is NotificationWriteResult.Existing -> Unit
        }
    }

    private fun Instant.asNotificationInstant(): String = NOTIFICATION_INSTANT_FORMAT.format(this.atZone(ZoneOffset.UTC))

    private companion object {
        val NOTIFICATION_INSTANT_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    }
}

object NoOpScheduledMovementNotificationRecorder : ScheduledMovementNotificationRecorder {
    override fun recordExpected(event: ScheduledExpectedNotification) = Unit

    override fun recordFailure(event: ScheduledFailureNotification) = Unit
}
