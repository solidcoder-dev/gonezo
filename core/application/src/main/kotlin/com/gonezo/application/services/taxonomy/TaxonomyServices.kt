package com.gonezo.taxonomy.application

import com.gonezo.taxonomy.application.AssignCategoryToTransactionCommand
import com.gonezo.taxonomy.application.AssignCategoryToTransactionUC
import com.gonezo.taxonomy.application.CreateCategoryCommand
import com.gonezo.taxonomy.application.CreateCategoryUC
import com.gonezo.taxonomy.application.ListCategoriesUC
import com.gonezo.taxonomy.application.UnassignCategoryFromTransactionCommand
import com.gonezo.taxonomy.application.UnassignCategoryFromTransactionUC
import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.TransactionCategoryAssignment
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository

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
