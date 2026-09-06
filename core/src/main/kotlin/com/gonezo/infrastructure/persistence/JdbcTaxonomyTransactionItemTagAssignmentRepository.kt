package com.gonezo.taxonomy.infrastructure.persistence

import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TransactionItemTagAssignment
import com.gonezo.taxonomy.domain.ports.TransactionItemTagAssignmentRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import java.sql.ResultSet
import java.time.Instant
import java.util.UUID

class JdbcTaxonomyTransactionItemTagAssignmentRepository(private val jdbcTemplate: NamedParameterJdbcTemplate) : TransactionItemTagAssignmentRepository {
    override fun replaceByTransactionItemId(transactionItemId: UUID, assignments: List<TransactionItemTagAssignment>) {
        jdbcTemplate.update(
            "delete from taxonomy_transaction_item_tag_assignments where transaction_item_id = :transaction_item_id",
            MapSqlParameterSource("transaction_item_id", transactionItemId.toString()),
        )
        val insertSql = """
            insert into taxonomy_transaction_item_tag_assignments (transaction_item_id, tag_id, assigned_at)
            values (:transaction_item_id, :tag_id, :assigned_at)
        """.trimIndent()
        assignments.distinctBy { it.tagId }.forEach { assignment ->
            jdbcTemplate.update(
                insertSql,
                MapSqlParameterSource()
                    .addValue("transaction_item_id", assignment.transactionItemId.toString())
                    .addValue("tag_id", assignment.tagId.toString())
                    .addValue("assigned_at", assignment.assignedAt.toString()),
            )
        }
    }

    override fun findByTransactionItemId(transactionItemId: UUID): List<TransactionItemTagAssignment> = jdbcTemplate.query(
        """
        select transaction_item_id, tag_id, assigned_at
        from taxonomy_transaction_item_tag_assignments
        where transaction_item_id = :transaction_item_id
        order by tag_id asc
        """.trimIndent(),
        MapSqlParameterSource("transaction_item_id", transactionItemId.toString()),
        rowMapper(),
    )

    override fun findByTransactionItemIds(transactionItemIds: Collection<UUID>): Map<UUID, List<TransactionItemTagAssignment>> {
        if (transactionItemIds.isEmpty()) return emptyMap()
        return jdbcTemplate.query(
            """
            select transaction_item_id, tag_id, assigned_at
            from taxonomy_transaction_item_tag_assignments
            where transaction_item_id in (:transaction_item_ids)
            order by transaction_item_id asc, tag_id asc
            """.trimIndent(),
            MapSqlParameterSource("transaction_item_ids", transactionItemIds.map(UUID::toString)),
            rowMapper(),
        ).groupBy { it.transactionItemId }
    }

    override fun deleteByTransactionItemIds(transactionItemIds: Collection<UUID>) {
        if (transactionItemIds.isEmpty()) return
        jdbcTemplate.update(
            "delete from taxonomy_transaction_item_tag_assignments where transaction_item_id in (:transaction_item_ids)",
            MapSqlParameterSource("transaction_item_ids", transactionItemIds.map(UUID::toString)),
        )
    }

    private fun rowMapper(): RowMapper<TransactionItemTagAssignment> = RowMapper { rs: ResultSet, _ ->
        TransactionItemTagAssignment(
            transactionItemId = UUID.fromString(rs.getString("transaction_item_id")),
            tagId = TagId.from(rs.getString("tag_id")),
            assignedAt = Instant.parse(rs.getString("assigned_at")),
        )
    }
}
