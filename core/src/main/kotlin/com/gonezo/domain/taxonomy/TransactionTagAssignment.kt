package com.gonezo.taxonomy.domain

import java.time.Instant
import java.util.UUID

data class TransactionTagAssignment(
  val transactionId: UUID,
  val tagId: TagId,
  val assignedAt: Instant,
) {
  companion object {
    fun assign(
      transactionId: UUID,
      tagId: TagId,
      assignedAt: Instant,
    ): TransactionTagAssignment = TransactionTagAssignment(
      transactionId = transactionId,
      tagId = tagId,
      assignedAt = assignedAt,
    )
  }
}
