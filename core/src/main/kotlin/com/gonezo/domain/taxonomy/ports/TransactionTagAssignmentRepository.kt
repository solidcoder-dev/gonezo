package com.gonezo.taxonomy.domain.ports

import com.gonezo.taxonomy.domain.TransactionTagAssignment
import java.util.UUID

interface TransactionTagAssignmentRepository {
  fun replaceByTransactionId(transactionId: UUID, assignments: List<TransactionTagAssignment>)

  fun deleteByTransactionIds(transactionIds: Collection<UUID>) {
    transactionIds.forEach { replaceByTransactionId(it, emptyList()) }
  }

  fun findByTransactionId(transactionId: UUID): List<TransactionTagAssignment>

  fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, List<TransactionTagAssignment>>
}
