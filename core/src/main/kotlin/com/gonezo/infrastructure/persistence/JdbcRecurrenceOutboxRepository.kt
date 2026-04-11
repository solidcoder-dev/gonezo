package com.gonezo.recurrence.infrastructure.persistence

import com.gonezo.recurrence.domain.RecurrenceOutboxMessage
import com.gonezo.recurrence.domain.RecurrenceOutboxStatus
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.ports.RecurrenceOutboxRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant
import java.util.UUID

@Repository
class JdbcRecurrenceOutboxRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : RecurrenceOutboxRepository {
  override fun save(message: RecurrenceOutboxMessage) {
    val sql = """
      insert into recurrence_outbox (
        id, aggregate_id, occurrence_id, event_type, payload_json, status, attempts, last_error, created_at, published_at
      ) values (
        :id, :aggregate_id, :occurrence_id, :event_type, :payload_json, :status, :attempts, :last_error, :created_at, :published_at
      )
      on conflict(id) do update set
        aggregate_id = excluded.aggregate_id,
        occurrence_id = excluded.occurrence_id,
        event_type = excluded.event_type,
        payload_json = excluded.payload_json,
        status = excluded.status,
        attempts = excluded.attempts,
        last_error = excluded.last_error,
        created_at = excluded.created_at,
        published_at = excluded.published_at
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", message.id.toString())
      .addValue("aggregate_id", message.aggregateId.toString())
      .addValue("occurrence_id", message.occurrenceId?.toString())
      .addValue("event_type", message.eventType)
      .addValue("payload_json", message.payloadJson)
      .addValue("status", message.status.value)
      .addValue("attempts", message.attempts)
      .addValue("last_error", message.lastError)
      .addValue("created_at", message.createdAt.toString())
      .addValue("published_at", message.publishedAt?.toString())
    jdbcTemplate.update(sql, params)
  }

  override fun findPending(limit: Int): List<RecurrenceOutboxMessage> {
    val sql = """
      select *
      from recurrence_outbox
      where status = :pending
      order by created_at asc, id asc
      limit :limit
    """.trimIndent()
    val params = MapSqlParameterSource()
      .addValue("pending", RecurrenceOutboxStatus.PENDING.value)
      .addValue("limit", limit)
    return jdbcTemplate.query(sql, params, rowMapper())
  }

  override fun findById(id: UUID): RecurrenceOutboxMessage? {
    val sql = """
      select *
      from recurrence_outbox
      where id = :id
    """.trimIndent()
    return jdbcTemplate.query(sql, MapSqlParameterSource("id", id.toString()), rowMapper()).firstOrNull()
  }

  private fun rowMapper(): RowMapper<RecurrenceOutboxMessage> = RowMapper { rs: ResultSet, _ ->
    RecurrenceOutboxMessage(
      id = UUID.fromString(rs.getString("id")),
      aggregateId = RecurringMovementId.from(rs.getString("aggregate_id")),
      occurrenceId = rs.getString("occurrence_id")?.let(UUID::fromString),
      eventType = rs.getString("event_type"),
      payloadJson = rs.getString("payload_json"),
      status = RecurrenceOutboxStatus.from(rs.getString("status")),
      attempts = rs.getInt("attempts"),
      lastError = rs.getString("last_error"),
      createdAt = Instant.parse(rs.getString("created_at")),
      publishedAt = rs.getString("published_at")?.let(Instant::parse),
    )
  }
}
