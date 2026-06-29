package com.gonezo.analytics.infrastructure.persistence

import com.gonezo.analytics.domain.AnalyticsExclusion
import com.gonezo.analytics.domain.AnalyticsExclusionReason
import com.gonezo.analytics.domain.AnalyticsExclusionScopeType
import com.gonezo.analytics.domain.ports.AnalyticsExclusionRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant
import java.util.UUID

@Repository
class JdbcAnalyticsExclusionRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : AnalyticsExclusionRepository {
  override fun save(exclusion: AnalyticsExclusion) {
    jdbcTemplate.update(
      """
        insert into analytics_exclusions (
          id, scope_type, scope_id, reason, created_at
        ) values (
          :id, :scope_type, :scope_id, :reason, :created_at
        )
        on conflict(scope_type, scope_id, reason) do update set
          created_at = excluded.created_at
      """.trimIndent(),
      MapSqlParameterSource()
        .addValue("id", exclusion.id.toString())
        .addValue("scope_type", exclusion.scopeType.value)
        .addValue("scope_id", exclusion.scopeId)
        .addValue("reason", exclusion.reason.value)
        .addValue("created_at", exclusion.createdAt.toString()),
    )
  }

  override fun findByScope(scopeType: AnalyticsExclusionScopeType, scopeId: String): List<AnalyticsExclusion> =
    jdbcTemplate.query(
      """
        select id, scope_type, scope_id, reason, created_at
        from analytics_exclusions
        where scope_type = :scope_type
          and scope_id = :scope_id
        order by created_at asc, id asc
      """.trimIndent(),
      MapSqlParameterSource()
        .addValue("scope_type", scopeType.value)
        .addValue("scope_id", scopeId),
      rowMapper(),
    )

  override fun listAll(): List<AnalyticsExclusion> =
    jdbcTemplate.query(
      """
        select id, scope_type, scope_id, reason, created_at
        from analytics_exclusions
        order by created_at asc, id asc
      """.trimIndent(),
      rowMapper(),
    )

  private fun rowMapper(): RowMapper<AnalyticsExclusion> = RowMapper { rs: ResultSet, _ ->
    AnalyticsExclusion(
      id = UUID.fromString(rs.getString("id")),
      scopeType = AnalyticsExclusionScopeType.from(rs.getString("scope_type")),
      scopeId = rs.getString("scope_id"),
      reason = AnalyticsExclusionReason.from(rs.getString("reason")),
      createdAt = Instant.parse(rs.getString("created_at")),
    )
  }
}
