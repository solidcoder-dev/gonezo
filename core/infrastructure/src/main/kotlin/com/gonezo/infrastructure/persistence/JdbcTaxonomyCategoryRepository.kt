package com.gonezo.infrastructure.persistence

import com.gonezo.domain.taxonomy.Category
import com.gonezo.domain.taxonomy.CategoryAppliesTo
import com.gonezo.domain.taxonomy.CategoryId
import com.gonezo.domain.taxonomy.CategoryStatus
import com.gonezo.domain.taxonomy.ports.CategoryRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant

@Repository
class JdbcTaxonomyCategoryRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : CategoryRepository {
  override fun save(category: Category) {
    val sql = """
      insert into taxonomy_categories (id, name, name_normalized, applies_to, status, created_at, archived_at)
      values (:id, :name, :name_normalized, :applies_to, :status, :created_at, :archived_at)
      on conflict(id) do update set
        name = excluded.name,
        name_normalized = excluded.name_normalized,
        applies_to = excluded.applies_to,
        status = excluded.status,
        created_at = excluded.created_at,
        archived_at = excluded.archived_at
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("id", category.id.toString())
      .addValue("name", category.name)
      .addValue("name_normalized", category.name.trim().lowercase())
      .addValue("applies_to", category.appliesTo.value)
      .addValue("status", category.status.value)
      .addValue("created_at", category.createdAt.toString())
      .addValue("archived_at", category.archivedAt?.toString())

    jdbcTemplate.update(sql, params)
  }

  override fun findById(id: CategoryId): Category? {
    val sql = """
      select id, name, applies_to, status, created_at, archived_at
      from taxonomy_categories
      where id = :id
    """.trimIndent()
    return jdbcTemplate.query(sql, MapSqlParameterSource("id", id.toString()), rowMapper()).firstOrNull()
  }

  override fun findByIds(ids: Collection<CategoryId>): Map<CategoryId, Category> {
    if (ids.isEmpty()) {
      return emptyMap()
    }
    val sql = """
      select id, name, applies_to, status, created_at, archived_at
      from taxonomy_categories
      where id in (:ids)
    """.trimIndent()
    val params = MapSqlParameterSource("ids", ids.map(CategoryId::toString))
    return jdbcTemplate.query(sql, params, rowMapper()).associateBy { it.id }
  }

  override fun findByNormalizedNameAndAppliesTo(name: String, appliesTo: CategoryAppliesTo): Category? {
    val sql = """
      select id, name, applies_to, status, created_at, archived_at
      from taxonomy_categories
      where name_normalized = :name_normalized
        and applies_to = :applies_to
    """.trimIndent()
    val params = MapSqlParameterSource()
      .addValue("name_normalized", name.trim().lowercase())
      .addValue("applies_to", appliesTo.value)
    return jdbcTemplate.query(sql, params, rowMapper()).firstOrNull()
  }

  override fun listAll(): List<Category> {
    val sql = """
      select id, name, applies_to, status, created_at, archived_at
      from taxonomy_categories
      order by applies_to asc, name_normalized asc, id asc
    """.trimIndent()
    return jdbcTemplate.query(sql, rowMapper())
  }

  private fun rowMapper(): RowMapper<Category> = RowMapper { rs: ResultSet, _ ->
    Category(
      id = CategoryId.from(rs.getString("id")),
      name = rs.getString("name"),
      appliesTo = CategoryAppliesTo.from(rs.getString("applies_to")),
      status = CategoryStatus.from(rs.getString("status")),
      createdAt = Instant.parse(rs.getString("created_at")),
      archivedAt = rs.getString("archived_at")?.let(Instant::parse),
    )
  }
}
