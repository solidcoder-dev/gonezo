package com.gonezo.notifications.domain

import java.time.Instant

class Notification private constructor(
    val id: NotificationId,
    val ownerId: String,
    val type: NotificationType,
    val deduplicationKey: String,
    val sourceType: NotificationSourceType,
    val sourceId: String,
    val originOccurrenceId: String,
    val subject: String,
    val errorCode: String?,
    val occurredAt: Instant,
    val createdAt: Instant,
    val readAt: Instant?,
    val withdrawnAt: Instant?,
) {
    val isUnreadActive: Boolean
        get() = readAt == null && withdrawnAt == null

    fun markRead(at: Instant): Notification = if (readAt != null) this else copyState(readAt = at)

    fun withdraw(at: Instant): Notification = if (withdrawnAt != null) this else copyState(withdrawnAt = at)

    private fun copyState(readAt: Instant? = this.readAt, withdrawnAt: Instant? = this.withdrawnAt): Notification = Notification(
        id = id,
        ownerId = ownerId,
        type = type,
        deduplicationKey = deduplicationKey,
        sourceType = sourceType,
        sourceId = sourceId,
        originOccurrenceId = originOccurrenceId,
        subject = subject,
        errorCode = errorCode,
        occurredAt = occurredAt,
        createdAt = createdAt,
        readAt = readAt,
        withdrawnAt = withdrawnAt,
    )

    companion object {
        fun create(
            id: NotificationId,
            ownerId: String,
            type: NotificationType,
            deduplicationKey: String,
            sourceType: NotificationSourceType,
            sourceId: String,
            originOccurrenceId: String,
            subject: String,
            errorCode: String?,
            occurredAt: Instant,
            createdAt: Instant,
        ): Notification = build(
            id = id,
            ownerId = ownerId,
            type = type,
            deduplicationKey = deduplicationKey,
            sourceType = sourceType,
            sourceId = sourceId,
            originOccurrenceId = originOccurrenceId,
            subject = subject,
            errorCode = errorCode,
            occurredAt = occurredAt,
            createdAt = createdAt,
            readAt = null,
            withdrawnAt = null,
        )

        fun rehydrate(
            id: NotificationId,
            ownerId: String,
            type: NotificationType,
            deduplicationKey: String,
            sourceType: NotificationSourceType,
            sourceId: String,
            originOccurrenceId: String,
            subject: String,
            errorCode: String?,
            occurredAt: Instant,
            createdAt: Instant,
            readAt: Instant?,
            withdrawnAt: Instant?,
        ): Notification = build(
            id = id,
            ownerId = ownerId,
            type = type,
            deduplicationKey = deduplicationKey,
            sourceType = sourceType,
            sourceId = sourceId,
            originOccurrenceId = originOccurrenceId,
            subject = subject,
            errorCode = errorCode,
            occurredAt = occurredAt,
            createdAt = createdAt,
            readAt = readAt,
            withdrawnAt = withdrawnAt,
        )

        private fun build(
            id: NotificationId,
            ownerId: String,
            type: NotificationType,
            deduplicationKey: String,
            sourceType: NotificationSourceType,
            sourceId: String,
            originOccurrenceId: String,
            subject: String,
            errorCode: String?,
            occurredAt: Instant,
            createdAt: Instant,
            readAt: Instant?,
            withdrawnAt: Instant?,
        ): Notification {
            require(ownerId.isNotBlank()) { "ownerId is required" }
            require(deduplicationKey.isNotBlank()) { "deduplicationKey is required" }
            require(sourceId.isNotBlank()) { "sourceId is required" }
            require(originOccurrenceId.isNotBlank()) { "originOccurrenceId is required" }
            require(subject.isNotBlank()) { "subject is required" }
            require(type.sourceType == sourceType) { "notification type and source type are incompatible" }
            require(type.acceptsErrorCode(errorCode)) { "notification error code is incompatible with type" }
            return Notification(
                id = id,
                ownerId = ownerId.trim(),
                type = type,
                deduplicationKey = deduplicationKey.trim(),
                sourceType = sourceType,
                sourceId = sourceId.trim(),
                originOccurrenceId = originOccurrenceId.trim(),
                subject = subject.trim(),
                errorCode = errorCode?.trim()?.ifBlank { null },
                occurredAt = occurredAt,
                createdAt = createdAt,
                readAt = readAt,
                withdrawnAt = withdrawnAt,
            )
        }

        private val NotificationType.sourceType: NotificationSourceType
            get() = when (this) {
                NotificationType.SCHEDULED_CONFIRMATION_REQUIRED -> NotificationSourceType.EXPECTED
                NotificationType.SCHEDULED_PROCESSING_FAILED -> NotificationSourceType.SCHEDULED
            }

        private fun NotificationType.acceptsErrorCode(errorCode: String?): Boolean = when (this) {
            NotificationType.SCHEDULED_CONFIRMATION_REQUIRED -> errorCode == null
            NotificationType.SCHEDULED_PROCESSING_FAILED -> !errorCode.isNullOrBlank()
        }
    }
}
