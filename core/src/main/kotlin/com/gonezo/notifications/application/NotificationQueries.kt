package com.gonezo.notifications.application

import com.gonezo.notifications.domain.Notification
import java.time.Instant

data class NotificationsListQuery(
    val filter: String,
    val beforeCursor: String? = null,
    val limit: Int = 30,
)

data class NotificationItem(
    val id: String,
    val type: String,
    val sourceType: String,
    val sourceId: String,
    val subject: String,
    val errorCode: String?,
    val occurredAt: Instant,
    val createdAt: Instant,
    val readAt: Instant?,
    val withdrawnAt: Instant?,
)

data class NotificationsListResult(
    val items: List<NotificationItem>,
    val nextCursor: String?,
    val snapshotCursor: String?,
)

sealed interface NotificationCommandResult {
    data class Found(val item: NotificationItem) : NotificationCommandResult
    data object NotFound : NotificationCommandResult
}

class NotificationQueries(
    private val notifications: NotificationRepository,
    private val reconciliation: ReconcileNotificationsService? = null,
) {
    fun notificationsList(ownerId: String, query: NotificationsListQuery): NotificationsListResult {
        val filter = when (query.filter) {
            "all" -> NotificationListFilter.ALL
            "unread" -> NotificationListFilter.UNREAD
            else -> error("Unsupported notification filter")
        }
        require(query.limit in 1..100) { "limit must be between 1 and 100" }
        val beforeSequence = query.beforeCursor?.let(NotificationCursor::decode)
        val snapshot = notifications.snapshotSequence(ownerId)
        val page = notifications.list(ownerId, filter, beforeSequence, query.limit)
        return NotificationsListResult(
            items = page.items.map { it.notification.toItem() },
            nextCursor = page.nextSequence?.let(NotificationCursor::encode),
            snapshotCursor = snapshot?.let(NotificationCursor::encode),
        )
    }

    fun notificationsCountUnread(ownerId: String): Int = notifications.countUnread(ownerId)

    fun notificationsMarkRead(ownerId: String, id: String, at: Instant): NotificationCommandResult =
        notifications.markRead(ownerId, id, at).toCommandResult()

    fun notificationsMarkAllRead(ownerId: String, throughCursor: String, at: Instant): Int =
        notifications.markAllRead(ownerId, NotificationCursor.decode(throughCursor), at)

    fun notificationsReconcile(ownerId: String, relevance: NotificationRelevance, at: Instant): Int =
        requireNotNull(reconciliation) { "Notification reconciliation is not configured" }
            .execute(ownerId, relevance, at)

    private fun NotificationLookupResult.toCommandResult(): NotificationCommandResult = when (this) {
        NotificationLookupResult.NotFound -> NotificationCommandResult.NotFound
        is NotificationLookupResult.Found -> NotificationCommandResult.Found(row.notification.toItem())
    }

    private fun Notification.toItem(): NotificationItem = NotificationItem(
        id = id.toString(),
        type = type.value,
        sourceType = sourceType.value,
        sourceId = sourceId,
        subject = subject,
        errorCode = errorCode,
        occurredAt = occurredAt,
        createdAt = createdAt,
        readAt = readAt,
        withdrawnAt = withdrawnAt,
    )
}

private object NotificationCursor {
    private const val PREFIX = "sequence:"

    fun encode(sequence: Long): String = "$PREFIX$sequence"

    fun decode(cursor: String): Long {
        require(cursor.startsWith(PREFIX)) { "Invalid notification cursor" }
        return cursor.removePrefix(PREFIX).toLongOrNull()?.takeIf { it > 0 }
            ?: error("Invalid notification cursor")
    }
}
