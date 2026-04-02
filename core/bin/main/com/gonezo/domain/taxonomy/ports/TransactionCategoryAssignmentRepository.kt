package com.gonezo.taxonomy.domain.ports

import com.gonezo.taxonomy.domain.TransactionCategoryAssignment
import java.util.UUID

interface TransactionCategoryAssignmentRepository {
  fun upsert(assignment: TransactionCategoryAssignment)

  fun deleteByTransactionId(transactionId: UUID)

  fun findByTransactionId(transactionId: UUID): TransactionCategoryAssignment?

  fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, TransactionCategoryAssignment>
}
