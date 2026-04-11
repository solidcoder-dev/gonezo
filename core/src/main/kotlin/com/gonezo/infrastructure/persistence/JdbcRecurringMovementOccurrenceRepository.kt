package com.gonezo.recurrence.infrastructure.persistence

import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.recurrence.domain.RecurringMovementOccurrenceStatus
import com.gonezo.recurrence.domain.ports.RecurringMovementOccurrenceRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant
import java.util.UUID

@Repository
class JdbcRecurringMovementOccurrenceRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : RecurringMovementOccurrenceRepository {
  override fun save(occurrence: RecurringMovementOccurrence) {
    val sql = """
      insert into recurring_movement_occurrences (
        id, recurring_movement_id, due_at, status, ledger_transaction_id, error_code, error_message, created_at, updated_at, acknowledged_at
      ) values (
        :id, :recurring_movement_id, :due_at, :status, :ledger_transaction_id, :error_code, :error_message, :created_at, :updated_at, :acknowledged_at
      )
      on conflict(id) do update set
        recurring_movement_id = excluded.recurring_movement_id,
        due_at = excluded.due_at,
        status = excluded.status,
        ledger_transaction_id = excluded.ledger_transaction_id,
        error_code = excluded.error_code,
        error_message = excluded.error_message,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        acknowledged_at = excluded.acknowledged_at
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", occurrence.id.toString())
      .addValue("recurring_movement_id", occurrence.recurringMovementId.toString())
      .addValue("due_at", occurrence.dueAt.toString())
      .addValue("status", occurrence.status.value)
      .addValue("ledger_transaction_id", occurrence.ledgerTransactionId)
      .addValue("error_code", occurrence.errorCode)
      .addValue("error_message", occurrence.errorMessage)
      .addValue("created_at", occurrence.createdAt.toString())
      .addValue("updated_at", occurrence.updatedAt.toString())
      .addValue("acknowledged_at", occurrence.acknowledgedAt?.toString())
    jdbcTemplate.update(sql, params)
  }

  override fun findById(id: UUID): RecurringMovementOccurrence? {
    val sql = """
      select *
      from recurring_movement_occurrences
      where id = :id
    """.trimIndent()
    return jdbcTemplate.query(sql, MapSqlParameterSource("id", id.toString()), rowMapper()).firstOrNull()
  }

  override fun findByRecurringMovementAndDueAt(
    recurringMovementId: RecurringMovementId,
    dueAt: Instant,
  ): RecurringMovementOccurrence? {
    val sql = """
      select *
      from recurring_movement_occurrences
      where recurring_movement_id = :recurring_movement_id
        and due_at = :due_at
      limit 1
    """.trimIndent()
    val params = MapSqlParameterSource()
      .addValue("recurring_movement_id", recurringMovementId.toString())
      .addValue("due_at", dueAt.toString())
    return jdbcTemplate.query(sql, params, rowMapper()).firstOrNull()
  }

  override fun listByRecurringMovement(recurringMovementId: RecurringMovementId): List<RecurringMovementOccurrence> {
    val sql = """
      select *
      from recurring_movement_occurrences
      where recurring_movement_id = :recurring_movement_id
      order by due_at asc, id asc
    """.trimIndent()
    return jdbcTemplate.query(
      sql,
      MapSqlParameterSource("recurring_movement_id", recurringMovementId.toString()),
      rowMapper(),
    )
  }

  private fun rowMapper(): RowMapper<RecurringMovementOccurrence> = RowMapper { rs: ResultSet, _ ->
    RecurringMovementOccurrence(
      id = UUID.fromString(rs.getString("id")),
      recurringMovementId = RecurringMovementId.from(rs.getString("recurring_movement_id")),
      dueAt = Instant.parse(rs.getString("due_at")),
      status = RecurringMovementOccurrenceStatus.from(rs.getString("status")),
      ledgerTransactionId = rs.getString("ledger_transaction_id"),
      errorCode = rs.getString("error_code"),
      errorMessage = rs.getString("error_message"),
      createdAt = Instant.parse(rs.getString("created_at")),
      updatedAt = Instant.parse(rs.getString("updated_at")),
      acknowledgedAt = rs.getString("acknowledged_at")?.let(Instant::parse),
    )
  }
}
