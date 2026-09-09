package com.gonezo.notifications.application

import java.time.Instant

data class PendingNotificationDelivery(val notificationId: String, val attempts: Int, val nextAttemptAt: Instant?)

interface NotificationDeliveryQueue {
    fun enqueueIfAbsent(notificationId: String)

    fun findEligible(now: Instant, limit: Int): List<PendingNotificationDelivery>

    fun markSubmitted(notificationIds: List<String>, submittedAt: Instant)

    fun markSuppressed(notificationIds: List<String>, errorCode: String?)

    fun markRetry(notificationId: String, nextAttemptAt: Instant, errorCode: String?)

    fun cancel(notificationId: String)
}
