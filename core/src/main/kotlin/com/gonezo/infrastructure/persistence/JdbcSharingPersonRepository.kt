package com.gonezo.sharing.infrastructure.persistence

import com.gonezo.sharing.domain.SharingPerson
import com.gonezo.sharing.domain.SharingPersonId
import com.gonezo.sharing.domain.ports.SharingPersonRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant

@Repository
class JdbcSharingPersonRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : SharingPersonRepository {
  override fun save(person: SharingPerson) {
    jdbcTemplate.update(
      """
        insert into sharing_persons (
          id, display_name, normalized_name, created_at, archived_at
        ) values (
          :id, :display_name, :normalized_name, :created_at, :archived_at
        )
        on conflict(id) do update set
          display_name = excluded.display_name,
          normalized_name = excluded.normalized_name,
          created_at = excluded.created_at,
          archived_at = excluded.archived_at
      """.trimIndent(),
      params(person),
    )
  }

  override fun findByNormalizedName(normalizedName: String): SharingPerson? =
    jdbcTemplate.query(
      """
        select id, display_name, normalized_name, created_at, archived_at
        from sharing_persons
        where normalized_name = :normalized_name
          and archived_at is null
        limit 1
      """.trimIndent(),
      MapSqlParameterSource("normalized_name", normalizedName),
      rowMapper(),
    ).firstOrNull()

  override fun listActive(): List<SharingPerson> =
    jdbcTemplate.query(
      """
        select id, display_name, normalized_name, created_at, archived_at
        from sharing_persons
        where archived_at is null
        order by display_name asc, id asc
      """.trimIndent(),
      rowMapper(),
    )

  private fun params(person: SharingPerson): MapSqlParameterSource =
    MapSqlParameterSource()
      .addValue("id", person.id.toString())
      .addValue("display_name", person.displayName)
      .addValue("normalized_name", person.normalizedName)
      .addValue("created_at", person.createdAt.toString())
      .addValue("archived_at", person.archivedAt?.toString())

  private fun rowMapper(): RowMapper<SharingPerson> = RowMapper { rs: ResultSet, _ ->
    SharingPerson(
      id = SharingPersonId.from(rs.getString("id")),
      displayName = rs.getString("display_name"),
      normalizedName = rs.getString("normalized_name"),
      createdAt = Instant.parse(rs.getString("created_at")),
      archivedAt = rs.getString("archived_at")?.let(Instant::parse),
    )
  }
}
