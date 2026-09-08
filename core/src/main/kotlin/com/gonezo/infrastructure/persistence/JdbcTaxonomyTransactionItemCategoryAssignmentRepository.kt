package com.gonezo.taxonomy.infrastructure.persistence

import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.TransactionItemCategoryAssignment
import com.gonezo.taxonomy.domain.ports.TransactionItemCategoryAssignmentRepository
import org.springframework.jdbc.core.RowMapper
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import java.sql.ResultSet
import java.time.Instant
import java.util.UUID

class JdbcTaxonomyTransactionItemCategoryAssignmentRepository(private val jdbcTemplate: NamedParameterJdbcTemplate) : TransactionItemCategoryAssignmentRepository {
    override fun upsert(assignment: TransactionItemCategoryAssignment) {
        jdbcTemplate.update(
            """
            insert into taxonomy_transaction_item_category_assignments (transaction_item_id, category_id, assigned_at)
            values (:transaction_item_id, :category_id, :assigned_at)
            on conflict(transaction_item_id) do update set category_id = excluded.category_id, assigned_at = excluded.assigned_at
            """.trimIndent(),
            MapSqlParameterSource()
                .addValue("transaction_item_id", assignment.transactionItemId.toString())
                .addValue("category_id", assignment.categoryId.toString())
                .addValue("assigned_at", assignment.assignedAt.toString()),
        )
    }

    override fun deleteByTransactionItemIds(transactionItemIds: Collection<UUID>) {
        if (transactionItemIds.isEmpty()) return
        jdbcTemplate.update(
            "delete from taxonomy_transaction_item_category_assignments where transaction_item_id in (:transaction_item_ids)",
            MapSqlParameterSource("transaction_item_ids", transactionItemIds.map(UUID::toString)),
        )
    }

    override fun findByTransactionItemIds(transactionItemIds: Collection<UUID>): Map<UUID, TransactionItemCategoryAssignment> {
        if (transactionItemIds.isEmpty()) return emptyMap()
        return jdbcTemplate.query(
            """
            select transaction_item_id, category_id, assigned_at
            from taxonomy_transaction_item_category_assignments
            where transaction_item_id in (:transaction_item_ids)
            """.trimIndent(),
            MapSqlParameterSource("transaction_item_ids", transactionItemIds.map(UUID::toString)),
            rowMapper(),
        ).associateBy { it.transactionItemId }
    }

    private fun rowMapper(): RowMapper<TransactionItemCategoryAssignment> = RowMapper { rs: ResultSet, _ ->
        TransactionItemCategoryAssignment(
            transactionItemId = UUID.fromString(rs.getString("transaction_item_id")),
            categoryId = CategoryId.from(rs.getString("category_id")),
            assignedAt = Instant.parse(rs.getString("assigned_at")),
        )
    }
}
