package com.gonezo.taxonomy.infrastructure.persistence

import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TransactionTagAssignment
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Repository
import java.sql.ResultSet
import java.time.Instant
import java.util.UUID

@Repository
class JdbcTaxonomyTransactionTagAssignmentRepository(
  private val jdbcTemplate: NamedParameterJdbcTemplate,
) : TransactionTagAssignmentRepository {
  override fun replaceByTransactionId(transactionId: UUID, assignments: List<TransactionTagAssignment>) {
    val deleteSql = "delete from taxonomy_transaction_tag_assignments where transaction_id = :transaction_id"
    jdbcTemplate.update(deleteSql, MapSqlParameterSource("transaction_id", transactionId.toString()))

    if (assignments.isEmpty()) {
      return
    }

    val insertSql = """
      insert into taxonomy_transaction_tag_assignments (transaction_id, tag_id, assigned_at)
      values (:transaction_id, :tag_id, :assigned_at)
    """.trimIndent()

    assignments.forEach { assignment ->
      val params = MapSqlParameterSource()
        .addValue("transaction_id", assignment.transactionId.toString())
        .addValue("tag_id", assignment.tagId.toString())
        .addValue("assigned_at", assignment.assignedAt.toString())
      jdbcTemplate.update(insertSql, params)
    }
  }

  override fun deleteByTransactionIds(transactionIds: Collection<UUID>) {
    if (transactionIds.isEmpty()) {
      return
    }
    val sql = "delete from taxonomy_transaction_tag_assignments where transaction_id in (:transaction_ids)"
    val params = MapSqlParameterSource("transaction_ids", transactionIds.map(UUID::toString))
    jdbcTemplate.update(sql, params)
  }

  override fun findByTransactionId(transactionId: UUID): List<TransactionTagAssignment> {
    val sql = """
      select transaction_id, tag_id, assigned_at
      from taxonomy_transaction_tag_assignments
      where transaction_id = :transaction_id
      order by tag_id asc
    """.trimIndent()
    return jdbcTemplate.query(sql, MapSqlParameterSource("transaction_id", transactionId.toString()), rowMapper())
  }

  override fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, List<TransactionTagAssignment>> {
    if (transactionIds.isEmpty()) {
      return emptyMap()
    }

    val sql = """
      select transaction_id, tag_id, assigned_at
      from taxonomy_transaction_tag_assignments
      where transaction_id in (:transaction_ids)
      order by transaction_id asc, tag_id asc
    """.trimIndent()
    val params = MapSqlParameterSource("transaction_ids", transactionIds.map(UUID::toString))
    return jdbcTemplate.query(sql, params, rowMapper())
      .groupBy { it.transactionId }
  }

  private fun rowMapper(): RowMapper<TransactionTagAssignment> = RowMapper { rs: ResultSet, _ ->
    TransactionTagAssignment(
      transactionId = UUID.fromString(rs.getString("transaction_id")),
      tagId = TagId.from(rs.getString("tag_id")),
      assignedAt = Instant.parse(rs.getString("assigned_at")),
    )
  }
}
