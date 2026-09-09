package com.gonezo.notifications.infrastructure

import com.gonezo.notifications.application.NotificationDeliveryQueue
import com.gonezo.notifications.application.PendingNotificationDelivery
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
class JdbcNotificationDeliveryQueue(private val jdbc: NamedParameterJdbcTemplate) : NotificationDeliveryQueue {
    override fun enqueueIfAbsent(notificationId: String) {
        jdbc.update(
            "insert into notification_deliveries(notification_id, status, attempts) values (:notification_id, 'pending', 0) on conflict(notification_id) do nothing",
            MapSqlParameterSource("notification_id", notificationId),
        )
    }

    override fun findEligible(now: Instant, limit: Int): List<PendingNotificationDelivery> {
        require(limit > 0) { "limit must be greater than 0" }
        return jdbc.query(
            "select notification_id, attempts, next_attempt_at from notification_deliveries where status = 'pending' and (next_attempt_at is null or next_attempt_at <= :now) order by notification_id asc limit :limit",
            MapSqlParameterSource().addValue("now", now.toString()).addValue("limit", limit),
        ) { rs, _ ->
            PendingNotificationDelivery(
                notificationId = rs.getString("notification_id"),
                attempts = rs.getInt("attempts"),
                nextAttemptAt = rs.getString("next_attempt_at")?.let(Instant::parse),
            )
        }
    }

    override fun markSubmitted(notificationIds: List<String>, submittedAt: Instant) {
        notificationIds.forEach { id ->
            jdbc.update(
                "update notification_deliveries set status = 'submitted', submitted_at = :submitted_at where notification_id = :notification_id and status = 'pending'",
                MapSqlParameterSource().addValue("notification_id", id).addValue("submitted_at", submittedAt.toString()),
            )
        }
    }

    override fun markSuppressed(notificationIds: List<String>, errorCode: String?) {
        notificationIds.forEach { id ->
            jdbc.update(
                "update notification_deliveries set status = 'suppressed', last_error_code = :last_error_code where notification_id = :notification_id and status = 'pending'",
                MapSqlParameterSource().addValue("notification_id", id).addValue("last_error_code", errorCode),
            )
        }
    }

    override fun markRetry(notificationId: String, nextAttemptAt: Instant, errorCode: String?) {
        jdbc.update(
            "update notification_deliveries set attempts = attempts + 1, next_attempt_at = :next_attempt_at, last_error_code = :last_error_code where notification_id = :notification_id and status = 'pending'",
            MapSqlParameterSource()
                .addValue("notification_id", notificationId)
                .addValue("next_attempt_at", nextAttemptAt.toString())
                .addValue("last_error_code", errorCode),
        )
    }

    override fun cancel(notificationId: String) {
        jdbc.update(
            "update notification_deliveries set status = 'cancelled' where notification_id = :notification_id and status = 'pending'",
            MapSqlParameterSource("notification_id", notificationId),
        )
    }
}
