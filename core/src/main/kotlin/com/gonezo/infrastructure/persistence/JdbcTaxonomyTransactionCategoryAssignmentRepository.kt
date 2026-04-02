package com.gonezo.taxonomy.infrastructure.persistence

import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.TransactionCategoryAssignment
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant
import java.util.UUID

@Repository
class JdbcTaxonomyTransactionCategoryAssignmentRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : TransactionCategoryAssignmentRepository {
  override fun upsert(assignment: TransactionCategoryAssignment) {
    val sql = """
      insert into taxonomy_transaction_assignments (transaction_id, category_id, assigned_at)
      values (:transaction_id, :category_id, :assigned_at)
      on conflict(transaction_id) do update set
        category_id = excluded.category_id,
        assigned_at = excluded.assigned_at
    """.trimIndent()

    val params = MapSqlParameterSource()
      .addValue("transaction_id", assignment.transactionId.toString())
      .addValue("category_id", assignment.categoryId.toString())
      .addValue("assigned_at", assignment.assignedAt.toString())

    jdbcTemplate.update(sql, params)
  }

  override fun deleteByTransactionId(transactionId: UUID) {
    val sql = "delete from taxonomy_transaction_assignments where transaction_id = :transaction_id"
    jdbcTemplate.update(sql, MapSqlParameterSource("transaction_id", transactionId.toString()))
  }

  override fun findByTransactionId(transactionId: UUID): TransactionCategoryAssignment? {
    val sql = """
      select transaction_id, category_id, assigned_at
      from taxonomy_transaction_assignments
      where transaction_id = :transaction_id
    """.trimIndent()
    return jdbcTemplate.query(sql, MapSqlParameterSource("transaction_id", transactionId.toString()), rowMapper()).firstOrNull()
  }

  override fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, TransactionCategoryAssignment> {
    if (transactionIds.isEmpty()) {
      return emptyMap()
    }
    val sql = """
      select transaction_id, category_id, assigned_at
      from taxonomy_transaction_assignments
      where transaction_id in (:transaction_ids)
    """.trimIndent()
    val params = MapSqlParameterSource()
      .addValue("transaction_ids", transactionIds.map(UUID::toString))

    return jdbcTemplate.query(sql, params, rowMapper())
      .associateBy { it.transactionId }
  }

  private fun rowMapper(): RowMapper<TransactionCategoryAssignment> = RowMapper { rs: ResultSet, _ ->
    TransactionCategoryAssignment(
      transactionId = UUID.fromString(rs.getString("transaction_id")),
      categoryId = CategoryId.from(rs.getString("category_id")),
      assignedAt = Instant.parse(rs.getString("assigned_at")),
    )
  }
}
