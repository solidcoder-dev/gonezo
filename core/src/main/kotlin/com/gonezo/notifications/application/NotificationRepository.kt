package com.gonezo.notifications.application

import com.gonezo.notifications.domain.Notification
import com.gonezo.notifications.domain.NotificationSourceType
import java.time.Instant

enum class NotificationListFilter {
    ALL,
    UNREAD,
}

data class NotificationPage(
    val items: List<NotificationRow>,
    val nextSequence: Long?,
)

data class NotificationRow(val sequence: Long, val notification: Notification)

sealed interface NotificationWriteResult {
    data class Created(val row: NotificationRow) : NotificationWriteResult
    data class Existing(val row: NotificationRow) : NotificationWriteResult
}

sealed interface NotificationLookupResult {
    data class Found(val row: NotificationRow) : NotificationLookupResult
    data object NotFound : NotificationLookupResult
}

interface NotificationRepository {
    fun snapshotSequence(ownerId: String): Long?

    fun createIfAbsent(notification: Notification): NotificationWriteResult

    fun findById(ownerId: String, notificationId: String): NotificationLookupResult

    fun list(ownerId: String, filter: NotificationListFilter, beforeSequence: Long?, limit: Int): NotificationPage

    fun countUnread(ownerId: String): Int

    fun markRead(ownerId: String, notificationId: String, at: Instant): NotificationLookupResult

    fun markAllRead(ownerId: String, throughSequence: Long, at: Instant): Int

    fun withdrawBySource(ownerId: String, sourceType: NotificationSourceType, sourceId: String, at: Instant): Int

    fun withdraw(ownerId: String, notificationId: String, at: Instant): NotificationLookupResult
}
