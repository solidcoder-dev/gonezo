package com.gonezo.taxonomy.domain

import java.time.Instant
import java.util.UUID

data class TransactionCategoryAssignment(
  val transactionId: UUID,
  val categoryId: CategoryId,
  val assignedAt: Instant,
) {
  companion object {
    fun assign(
      transactionId: UUID,
      categoryId: CategoryId,
      assignedAt: Instant,
    ): TransactionCategoryAssignment = TransactionCategoryAssignment(
      transactionId = transactionId,
      categoryId = categoryId,
      assignedAt = assignedAt,
    )
  }
}
