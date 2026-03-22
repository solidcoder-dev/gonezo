package com.gonezo.domain.taxonomy.ports

import com.gonezo.domain.taxonomy.TransactionCategoryAssignment
import java.util.UUID

interface TransactionCategoryAssignmentRepository {
  fun upsert(assignment: TransactionCategoryAssignment)

  fun deleteByTransactionId(transactionId: UUID)

  fun findByTransactionId(transactionId: UUID): TransactionCategoryAssignment?

  fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, TransactionCategoryAssignment>
}
