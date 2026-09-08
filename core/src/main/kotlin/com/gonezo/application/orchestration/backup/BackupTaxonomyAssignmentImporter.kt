package com.gonezo.application.orchestration.backup

import com.gonezo.ledger.domain.Transaction
import com.gonezo.ledger.domain.TransactionType
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TransactionCategoryAssignment
import com.gonezo.taxonomy.domain.TransactionTagAssignment
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TagRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository
import java.time.Instant

class BackupTaxonomyAssignmentImporter(
    private val categoryRepository: CategoryRepository,
    private val tagRepository: TagRepository,
    private val categoryAssignmentRepository: TransactionCategoryAssignmentRepository,
    private val tagAssignmentRepository: TransactionTagAssignmentRepository,
) {
    fun importFor(transaction: Transaction, movement: BackupPostedMovement, importedAt: Instant) {
        val categoryId = movement.categoryId?.trim()?.ifBlank { null }?.let(CategoryId::from)
        if (categoryId != null) {
            val category = categoryRepository.findById(categoryId)
                ?: throw BackupImportRowException("CATEGORY_NOT_FOUND", "Category not found: $categoryId")
            val expectedAppliesTo = transaction.type.categoryAppliesTo()
                ?: throw BackupImportRowException("CATEGORY_APPLIES_TO_MISMATCH", "Transfers cannot be categorized")
            if (category.appliesTo != expectedAppliesTo) {
                throw BackupImportRowException(
                    "CATEGORY_APPLIES_TO_MISMATCH",
                    "Category $categoryId applies to ${category.appliesTo.value}, received ${transaction.type.value}",
                )
            }
            categoryAssignmentRepository.upsert(TransactionCategoryAssignment.assign(transaction.id.value, categoryId, importedAt))
        }

        val tagIds = movement.tagIds.mapNotNull { raw -> raw.trim().ifBlank { null }?.let(TagId::from) }
        if (tagIds.isNotEmpty()) {
            val tags = tagRepository.findByIds(tagIds)
            if (tags.size != tagIds.distinct().size) {
                val missing = tagIds.filterNot(tags::containsKey)
                throw BackupImportRowException("TAGS_NOT_FOUND", "Tags not found: ${missing.joinToString(",")}")
            }
            tagAssignmentRepository.replaceByTransactionId(
                transaction.id.value,
                tagIds.distinct().map { tagId -> TransactionTagAssignment.assign(transaction.id.value, tagId, importedAt) },
            )
        }
    }

    private fun TransactionType.categoryAppliesTo(): CategoryAppliesTo? = when (this) {
        TransactionType.EXPENSE -> CategoryAppliesTo.EXPENSE
        TransactionType.INCOME -> CategoryAppliesTo.INCOME
        TransactionType.TRANSFER, TransactionType.TRANSFER_IN, TransactionType.TRANSFER_OUT -> null
    }
}
