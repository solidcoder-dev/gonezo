package com.gonezo.notifications.application

import java.time.Duration
import java.time.Instant

data class NotificationDeliveryResult(
    val submitted: Int,
    val suppressed: Int,
    val retried: Int,
    val cancelled: Int,
)

class DeliverPendingNotificationsService(
    private val notifications: NotificationRepository,
    private val deliveries: NotificationDeliveryQueue,
    private val sender: SystemNotificationSender,
) {
    fun execute(ownerId: String, now: Instant): NotificationDeliveryResult {
        val eligible = deliveries.findEligible(now, 100)
        val active = eligible.mapNotNull { delivery ->
            when (val result = notifications.findById(ownerId, delivery.notificationId)) {
                NotificationLookupResult.NotFound -> {
                    deliveries.cancel(delivery.notificationId)
                    null
                }
                is NotificationLookupResult.Found -> if (result.row.notification.isUnreadActive) delivery else {
                    deliveries.cancel(delivery.notificationId)
                    null
                }
            }
        }
        if (active.isEmpty()) {
            if (notifications.countUnread(ownerId) == 0) sender.removeSummary()
            else if (sender.summaryExists()) sender.updateSummary(notifications.countUnread(ownerId))
            return NotificationDeliveryResult(0, 0, 0, eligible.size)
        }

        val outcome = sender.updateSummary(notifications.countUnread(ownerId))
        val ids = active.map { it.notificationId }
        return when (outcome) {
            SystemNotificationResult.Accepted -> {
                deliveries.markSubmitted(ids, now)
                NotificationDeliveryResult(ids.size, 0, 0, eligible.size - ids.size)
            }
            is SystemNotificationResult.Suppressed -> {
                deliveries.markSuppressed(ids, outcome.errorCode)
                NotificationDeliveryResult(0, ids.size, 0, eligible.size - ids.size)
            }
            is SystemNotificationResult.Failed -> {
                active.forEach { delivery ->
                    deliveries.markRetry(delivery.notificationId, now.plus(backoff(delivery.attempts)), outcome.errorCode)
                }
                NotificationDeliveryResult(0, 0, ids.size, eligible.size - ids.size)
            }
        }
    }

    private fun backoff(attempts: Int): Duration = Duration.ofMinutes(
        (1L shl attempts.coerceIn(0, 6)).coerceAtMost(60),
    )
}
