package com.gonezo.taxonomy.domain.ports

import com.gonezo.taxonomy.domain.TransactionItemCategoryAssignment
import java.util.UUID

interface TransactionItemCategoryAssignmentRepository {
    fun upsert(assignment: TransactionItemCategoryAssignment)

    fun deleteByTransactionItemIds(transactionItemIds: Collection<UUID>)

    fun findByTransactionItemIds(transactionItemIds: Collection<UUID>): Map<UUID, TransactionItemCategoryAssignment>
}
