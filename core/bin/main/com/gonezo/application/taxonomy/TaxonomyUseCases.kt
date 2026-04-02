package com.gonezo.taxonomy.application

import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId
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

data class CreateTagCommand(
  val name: String,
  val createdAt: Instant,
)

interface CreateTagUC {
  fun execute(command: CreateTagCommand): TagId
}

interface ListTagsUC {
  fun execute(): List<Tag>
}

data class ReplaceTransactionTagsCommand(
  val transactionId: UUID,
  val tagIds: List<TagId>,
  val assignedAt: Instant,
)

interface ReplaceTransactionTagsUC {
  fun execute(command: ReplaceTransactionTagsCommand)
}
