package com.gonezo.taxonomy.infrastructure.persistence

import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TagStatus
import com.gonezo.taxonomy.domain.ports.TagRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant

@Repository
class JdbcTaxonomyTagRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : TagRepository {
  override fun save(tag: Tag) {
    val sql = """
      insert into taxonomy_tags (id, name, name_normalized, status, created_at, archived_at)
      values (:id, :name, :name_normalized, :status, :created_at, :archived_at)
      on conflict(id) do update set
        name = excluded.name,
        name_normalized = excluded.name_normalized,
        status = excluded.status,
        created_at = excluded.created_at,
        archived_at = excluded.archived_at
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", tag.id.toString())
      .addValue("name", tag.name)
      .addValue("name_normalized", tag.name.trim().lowercase())
      .addValue("status", tag.status.value)
      .addValue("created_at", tag.createdAt.toString())
      .addValue("archived_at", tag.archivedAt?.toString())

    jdbcTemplate.update(sql, params)
  }

  override fun findById(id: TagId): Tag? {
    val sql = """
      select id, name, status, created_at, archived_at
      from taxonomy_tags
      where id = :id
    """.trimIndent()
    return jdbcTemplate.query(sql, MapSqlParameterSource("id", id.toString()), rowMapper()).firstOrNull()
  }

  override fun findByIds(ids: Collection<TagId>): Map<TagId, Tag> {
    if (ids.isEmpty()) {
      return emptyMap()
    }
    val sql = """
      select id, name, status, created_at, archived_at
      from taxonomy_tags
      where id in (:ids)
    """.trimIndent()
    val params = MapSqlParameterSource("ids", ids.map(TagId::toString))
    return jdbcTemplate.query(sql, params, rowMapper()).associateBy { it.id }
  }

  override fun findByNormalizedName(name: String): Tag? {
    val sql = """
      select id, name, status, created_at, archived_at
      from taxonomy_tags
      where name_normalized = :name_normalized
    """.trimIndent()
    val params = MapSqlParameterSource("name_normalized", name.trim().lowercase())
    return jdbcTemplate.query(sql, params, rowMapper()).firstOrNull()
  }

  override fun listAll(): List<Tag> {
    val sql = """
      select id, name, status, created_at, archived_at
      from taxonomy_tags
      order by name_normalized asc, id asc
    """.trimIndent()
    return jdbcTemplate.query(sql, rowMapper())
  }

  private fun rowMapper(): RowMapper<Tag> = RowMapper { rs: ResultSet, _ ->
    Tag(
      id = TagId.from(rs.getString("id")),
      name = rs.getString("name"),
      status = TagStatus.from(rs.getString("status")),
      createdAt = Instant.parse(rs.getString("created_at")),
      archivedAt = rs.getString("archived_at")?.let(Instant::parse),
    )
  }
}
