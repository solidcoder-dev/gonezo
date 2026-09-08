package com.gonezo.taxonomy.domain

import java.time.Instant
import java.util.UUID

data class TransactionItemCategoryAssignment(val transactionItemId: UUID, val categoryId: CategoryId, val assignedAt: Instant) {
    companion object {
        fun assign(transactionItemId: UUID, categoryId: CategoryId, assignedAt: Instant): TransactionItemCategoryAssignment = TransactionItemCategoryAssignment(transactionItemId, categoryId, assignedAt)
    }
}
