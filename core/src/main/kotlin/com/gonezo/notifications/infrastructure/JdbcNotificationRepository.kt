package com.gonezo.notifications.infrastructure

import com.gonezo.notifications.application.NotificationListFilter
import com.gonezo.notifications.application.NotificationLookupResult
import com.gonezo.notifications.application.NotificationPage
import com.gonezo.notifications.application.NotificationRepository
import com.gonezo.notifications.application.NotificationRow
import com.gonezo.notifications.application.NotificationWriteResult
import com.gonezo.notifications.domain.Notification
import com.gonezo.notifications.domain.NotificationId
import com.gonezo.notifications.domain.NotificationSourceType
import com.gonezo.notifications.domain.NotificationType
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant

@Repository
class JdbcNotificationRepository(private val jdbc: NamedParameterJdbcTemplate) : NotificationRepository {
    override fun snapshotSequence(ownerId: String): Long? = jdbc.queryForObject(
        "select max(sequence) from notifications where owner_id = :owner_id",
        MapSqlParameterSource("owner_id", ownerId),
        Long::class.java,
    )

    override fun createIfAbsent(notification: Notification): NotificationWriteResult {
        val inserted = jdbc.update(
            """
            insert into notifications (
              id, owner_id, type, deduplication_key, source_type, source_id,
              origin_occurrence_id, subject, error_code, occurred_at, created_at, read_at, withdrawn_at
            ) values (
              :id, :owner_id, :type, :deduplication_key, :source_type, :source_id,
              :origin_occurrence_id, :subject, :error_code, :occurred_at, :created_at, null, null
            ) on conflict(owner_id, deduplication_key) do nothing
            """.trimIndent(),
            params(notification),
        )
        val row = findByDeduplicationKey(notification.ownerId, notification.deduplicationKey)
            ?: error("Notification insert did not produce a row")
        return if (inserted == 1) NotificationWriteResult.Created(row) else NotificationWriteResult.Existing(row)
    }

    override fun findById(ownerId: String, notificationId: String): NotificationLookupResult = find(
        "owner_id = :owner_id and id = :id",
        MapSqlParameterSource().addValue("owner_id", ownerId).addValue("id", notificationId),
    )

    override fun list(ownerId: String, filter: NotificationListFilter, beforeSequence: Long?, limit: Int): NotificationPage {
        require(limit > 0) { "limit must be greater than 0" }
        val conditions = mutableListOf("owner_id = :owner_id")
        val params = MapSqlParameterSource("owner_id", ownerId).addValue("limit", limit)
        if (filter == NotificationListFilter.UNREAD) {
            conditions += "read_at is null and withdrawn_at is null"
        }
        if (beforeSequence != null) {
            conditions += "sequence < :before_sequence"
            params.addValue("before_sequence", beforeSequence)
        }
        val rows = jdbc.query(
            "select * from notifications where ${conditions.joinToString(" and ")} order by sequence desc limit :limit",
            params,
            rowMapper(),
        )
        return NotificationPage(
            items = rows,
            nextSequence = rows.lastOrNull()?.sequence?.takeIf { rows.size == limit },
        )
    }

    override fun countUnread(ownerId: String): Int = jdbc.queryForObject(
        "select count(*) from notifications where owner_id = :owner_id and read_at is null and withdrawn_at is null",
        MapSqlParameterSource("owner_id", ownerId),
        Int::class.java,
    ) ?: 0

    override fun markRead(ownerId: String, notificationId: String, at: Instant): NotificationLookupResult {
        jdbc.update(
            "update notifications set read_at = coalesce(read_at, :at) where owner_id = :owner_id and id = :id",
            MapSqlParameterSource().addValue("owner_id", ownerId).addValue("id", notificationId).addValue("at", at.toString()),
        )
        return findById(ownerId, notificationId)
    }

    override fun markAllRead(ownerId: String, throughSequence: Long, at: Instant): Int = jdbc.update(
        "update notifications set read_at = coalesce(read_at, :at) where owner_id = :owner_id and sequence <= :through_sequence and read_at is null",
        MapSqlParameterSource()
            .addValue("owner_id", ownerId)
            .addValue("through_sequence", throughSequence)
            .addValue("at", at.toString()),
    )

    override fun withdrawBySource(ownerId: String, sourceType: NotificationSourceType, sourceId: String, at: Instant): Int = jdbc.update(
        "update notifications set withdrawn_at = coalesce(withdrawn_at, :at) where owner_id = :owner_id and source_type = :source_type and source_id = :source_id and withdrawn_at is null",
        MapSqlParameterSource()
            .addValue("owner_id", ownerId)
            .addValue("source_type", sourceType.value)
            .addValue("source_id", sourceId)
            .addValue("at", at.toString()),
    )

    override fun withdraw(ownerId: String, notificationId: String, at: Instant): NotificationLookupResult {
        jdbc.update(
            "update notifications set withdrawn_at = coalesce(withdrawn_at, :at) where owner_id = :owner_id and id = :id",
            MapSqlParameterSource().addValue("owner_id", ownerId).addValue("id", notificationId).addValue("at", at.toString()),
        )
        return findById(ownerId, notificationId)
    }

    private fun findByDeduplicationKey(ownerId: String, deduplicationKey: String): NotificationRow? = jdbc.query(
        "select * from notifications where owner_id = :owner_id and deduplication_key = :deduplication_key",
        MapSqlParameterSource().addValue("owner_id", ownerId).addValue("deduplication_key", deduplicationKey),
        rowMapper(),
    ).firstOrNull()

    private fun find(where: String, params: MapSqlParameterSource): NotificationLookupResult = jdbc.query(
        "select * from notifications where $where",
        params,
        rowMapper(),
    ).firstOrNull()?.let(NotificationLookupResult::Found) ?: NotificationLookupResult.NotFound

    private fun rowMapper(): RowMapper<NotificationRow> = RowMapper { rs: ResultSet, _ ->
        NotificationRow(
            sequence = rs.getLong("sequence"),
            notification = Notification.rehydrate(
                id = NotificationId.from(rs.getString("id")),
                ownerId = rs.getString("owner_id"),
                type = NotificationType.from(rs.getString("type")),
                deduplicationKey = rs.getString("deduplication_key"),
                sourceType = NotificationSourceType.from(rs.getString("source_type")),
                sourceId = rs.getString("source_id"),
                originOccurrenceId = rs.getString("origin_occurrence_id"),
                subject = rs.getString("subject"),
                errorCode = rs.getString("error_code"),
                occurredAt = Instant.parse(rs.getString("occurred_at")),
                createdAt = Instant.parse(rs.getString("created_at")),
                readAt = rs.getString("read_at")?.let(Instant::parse),
                withdrawnAt = rs.getString("withdrawn_at")?.let(Instant::parse),
            ),
        )
    }

    private fun params(notification: Notification): MapSqlParameterSource = MapSqlParameterSource()
        .addValue("id", notification.id.toString())
        .addValue("owner_id", notification.ownerId)
        .addValue("type", notification.type.value)
        .addValue("deduplication_key", notification.deduplicationKey)
        .addValue("source_type", notification.sourceType.value)
        .addValue("source_id", notification.sourceId)
        .addValue("origin_occurrence_id", notification.originOccurrenceId)
        .addValue("subject", notification.subject)
        .addValue("error_code", notification.errorCode)
        .addValue("occurred_at", notification.occurredAt.toString())
        .addValue("created_at", notification.createdAt.toString())
}
