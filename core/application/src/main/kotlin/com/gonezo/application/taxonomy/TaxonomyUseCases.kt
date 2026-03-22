package com.gonezo.taxonomy.application

import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import java.time.Instant
import java.util.UUID

data class CreateCategoryCommand(
  val name: String,
  val appliesTo: CategoryAppliesTo,
  val createdAt: Instant,
)

interface CreateCategoryUC {
  fun execute(command: CreateCategoryCommand): CategoryId
}

interface ListCategoriesUC {
  fun execute(): List<Category>
}

data class AssignCategoryToTransactionCommand(
  val transactionId: UUID,
  val categoryId: CategoryId,
  val transactionType: String,
  val assignedAt: Instant,
)

interface AssignCategoryToTransactionUC {
  fun execute(command: AssignCategoryToTransactionCommand)
}

data class UnassignCategoryFromTransactionCommand(
  val transactionId: UUID,
)

interface UnassignCategoryFromTransactionUC {
  fun execute(command: UnassignCategoryFromTransactionCommand)
}
