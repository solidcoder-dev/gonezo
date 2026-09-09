package com.gonezo.notifications.application

import com.gonezo.notifications.domain.Notification
import java.time.Instant

fun interface NotificationRelevance {
    fun isRelevant(notification: Notification): Boolean
}

class ReconcileNotificationsService(
    private val notifications: NotificationRepository,
    private val deliveries: NotificationDeliveryQueue,
) {
    fun execute(ownerId: String, relevance: NotificationRelevance, at: Instant): Int {
        val active = notifications.list(ownerId, NotificationListFilter.ALL, beforeSequence = null, limit = 100).items
            .filter { it.notification.withdrawnAt == null }
        var withdrawn = 0
        active.forEach { row ->
            if (!relevance.isRelevant(row.notification)) {
                val result = notifications.withdraw(ownerId, row.notification.id.toString(), at)
                if (result is NotificationLookupResult.Found && result.row.notification.withdrawnAt != null) {
                    deliveries.cancel(row.notification.id.toString())
                    withdrawn += 1
                }
            }
        }
        return withdrawn
    }
}
