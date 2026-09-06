package com.gonezo.taxonomy.domain

import java.time.Instant
import java.util.UUID

data class TransactionItemTagAssignment(val transactionItemId: UUID, val tagId: TagId, val assignedAt: Instant) {
    companion object {
        fun assign(transactionItemId: UUID, tagId: TagId, assignedAt: Instant): TransactionItemTagAssignment = TransactionItemTagAssignment(transactionItemId, tagId, assignedAt)
    }
}
