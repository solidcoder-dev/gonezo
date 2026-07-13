package com.gonezo.taxonomy.application

import com.gonezo.taxonomy.application.AssignCategoryToTransactionCommand
import com.gonezo.taxonomy.application.AssignCategoryToTransactionUC
import com.gonezo.taxonomy.application.CreateCategoryCommand
import com.gonezo.taxonomy.application.CreateCategoryUC
import com.gonezo.taxonomy.application.CreateTagCommand
import com.gonezo.taxonomy.application.CreateTagUC
import com.gonezo.taxonomy.application.ListCategoriesUC
import com.gonezo.taxonomy.application.ReplaceTransactionTagsCommand
import com.gonezo.taxonomy.application.ReplaceTransactionTagsUC
import com.gonezo.taxonomy.application.RenameCategoryCommand
import com.gonezo.taxonomy.application.RenameCategoryUC
import com.gonezo.taxonomy.application.RenameTagCommand
import com.gonezo.taxonomy.application.RenameTagUC
import com.gonezo.taxonomy.application.UnassignCategoryFromTransactionCommand
import com.gonezo.taxonomy.application.UnassignCategoryFromTransactionUC
import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.CategoryWithUsage
import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TransactionCategoryAssignment
import com.gonezo.taxonomy.domain.TransactionTagAssignment
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TagRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository

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
  override fun execute(): List<CategoryWithUsage> = categoryRepository.listAll()
}

class RenameCategoryService(
  private val categoryRepository: CategoryRepository,
) : RenameCategoryUC {
  override fun execute(command: RenameCategoryCommand) {
    val category = categoryRepository.findById(command.categoryId)
      ?: throw TaxonomyCategoryNotFound(command.categoryId)
    val normalizedName = command.name.trim()
    require(normalizedName.isNotBlank()) { "category name is required" }
    val existing = categoryRepository.findByNormalizedNameAndAppliesTo(normalizedName, category.appliesTo)
    require(existing == null || existing.id == category.id) {
      "Category already exists for ${category.appliesTo.value}: $normalizedName"
    }
    categoryRepository.save(category.rename(normalizedName))
  }
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
      ?: throw TaxonomyCategoryNotFound(command.categoryId)

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

class CreateTagService(
  private val tagRepository: TagRepository,
) : CreateTagUC {
  override fun execute(command: CreateTagCommand): TagId {
    val normalizedName = command.name.trim()
    val existing = tagRepository.findByNormalizedName(normalizedName)
    require(existing == null) { "Tag already exists: $normalizedName" }
    val tag = Tag.create(
      id = TagId.random(),
      name = normalizedName,
      createdAt = command.createdAt,
    )
    tagRepository.save(tag)
    return tag.id
  }
}

class RenameTagService(
  private val tagRepository: TagRepository,
) : RenameTagUC {
  override fun execute(command: RenameTagCommand) {
    val tag = tagRepository.findById(command.tagId)
      ?: throw TaxonomyTagNotFound(command.tagId)
    val normalizedName = command.name.trim()
    require(normalizedName.isNotBlank()) { "tag name is required" }
    val existing = tagRepository.findByNormalizedName(normalizedName)
    require(existing == null || existing.id == tag.id) {
      "Tag already exists: $normalizedName"
    }
    tagRepository.save(tag.rename(normalizedName))
  }
}

class ReplaceTransactionTagsService(
  private val tagRepository: TagRepository,
  private val assignmentRepository: TransactionTagAssignmentRepository,
) : ReplaceTransactionTagsUC {
  override fun execute(command: ReplaceTransactionTagsCommand) {
    val uniqueTagIds = command.tagIds.distinct()
    val tagsById = tagRepository.findByIds(uniqueTagIds)
    require(tagsById.size == uniqueTagIds.size) {
      val missing = uniqueTagIds.filterNot(tagsById::containsKey)
      "Tags not found: ${missing.joinToString(",")}"
    }
    tagsById.values.forEach { it.ensureCanAssign() }

    val assignments = uniqueTagIds.map { tagId ->
      TransactionTagAssignment.assign(
        transactionId = command.transactionId,
        tagId = tagId,
        assignedAt = command.assignedAt,
      )
    }
    assignmentRepository.replaceByTransactionId(command.transactionId, assignments)
  }
}
