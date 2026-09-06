package com.gonezo.taxonomy.domain.ports

import com.gonezo.taxonomy.domain.TransactionItemTagAssignment
import java.util.UUID

interface TransactionItemTagAssignmentRepository {
    fun replaceByTransactionItemId(transactionItemId: UUID, assignments: List<TransactionItemTagAssignment>)

    fun findByTransactionItemId(transactionItemId: UUID): List<TransactionItemTagAssignment>

    fun findByTransactionItemIds(transactionItemIds: Collection<UUID>): Map<UUID, List<TransactionItemTagAssignment>>

    fun deleteByTransactionItemIds(transactionItemIds: Collection<UUID>)
}
