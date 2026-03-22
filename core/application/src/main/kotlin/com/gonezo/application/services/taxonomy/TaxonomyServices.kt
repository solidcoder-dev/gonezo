package com.gonezo.application.services.taxonomy

import com.gonezo.application.taxonomy.AssignCategoryToTransactionCommand
import com.gonezo.application.taxonomy.AssignCategoryToTransactionUC
import com.gonezo.application.taxonomy.CreateCategoryCommand
import com.gonezo.application.taxonomy.CreateCategoryUC
import com.gonezo.application.taxonomy.ListCategoriesUC
import com.gonezo.application.taxonomy.UnassignCategoryFromTransactionCommand
import com.gonezo.application.taxonomy.UnassignCategoryFromTransactionUC
import com.gonezo.domain.taxonomy.Category
import com.gonezo.domain.taxonomy.CategoryAppliesTo
import com.gonezo.domain.taxonomy.CategoryId
import com.gonezo.domain.taxonomy.TransactionCategoryAssignment
import com.gonezo.domain.taxonomy.ports.CategoryRepository
import com.gonezo.domain.taxonomy.ports.TransactionCategoryAssignmentRepository

class CreateCategoryService(
  private val categoryRepository: CategoryRepository,
) : CreateCategoryUC {
  override fun execute(command: CreateCategoryCommand): CategoryId {
    val normalizedName = command.name.trim()
    val existing = categoryRepository.findByNormalizedNameAndAppliesTo(normalizedName, command.appliesTo)
    require(existing == null) { "Category already exists for ${command.appliesTo.value}: $normalizedName" }
    val category = Category.create(
      id = CategoryId.random(),
      name = normalizedName,
      appliesTo = command.appliesTo,
      createdAt = command.createdAt,
    )
    categoryRepository.save(category)
    return category.id
  }
}

class ListCategoriesService(
  private val categoryRepository: CategoryRepository,
) : ListCategoriesUC {
  override fun execute(): List<Category> = categoryRepository.listAll()
}

class AssignCategoryToTransactionService(
  private val categoryRepository: CategoryRepository,
  private val assignmentRepository: TransactionCategoryAssignmentRepository,
) : AssignCategoryToTransactionUC {
  override fun execute(command: AssignCategoryToTransactionCommand) {
    val normalizedType = command.transactionType.trim().lowercase()
    require(normalizedType == "income" || normalizedType == "expense") {
      "Only income/expense transactions can be categorized"
    }

    val category = categoryRepository.findById(command.categoryId)
      ?: throw IllegalStateException("Category not found: ${command.categoryId}")

    category.ensureCanAssign()
    val expectedAppliesTo = CategoryAppliesTo.from(normalizedType)
    require(category.appliesTo == expectedAppliesTo) {
      "Category ${category.id} applies to ${category.appliesTo.value}, received $normalizedType"
    }

    assignmentRepository.upsert(
      TransactionCategoryAssignment.assign(
        transactionId = command.transactionId,
        categoryId = command.categoryId,
        assignedAt = command.assignedAt,
      ),
    )
  }
}

class UnassignCategoryFromTransactionService(
  private val assignmentRepository: TransactionCategoryAssignmentRepository,
) : UnassignCategoryFromTransactionUC {
  override fun execute(command: UnassignCategoryFromTransactionCommand) {
    assignmentRepository.deleteByTransactionId(command.transactionId)
  }
}
