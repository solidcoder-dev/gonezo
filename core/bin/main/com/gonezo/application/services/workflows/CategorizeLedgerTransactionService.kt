package com.gonezo.application.orchestration

import com.gonezo.application.orchestration.CategorizationStatus
import com.gonezo.application.orchestration.CategorizeLedgerTransactionCommand
import com.gonezo.application.orchestration.CategorizeLedgerTransactionUC
import com.gonezo.application.orchestration.ProcessTransactionCategorizationCommand
import com.gonezo.application.orchestration.ProcessTransactionCategorizationUC
import com.gonezo.application.orchestration.TxCategorizationState
import com.gonezo.taxonomy.application.CreateCategoryCommand
import com.gonezo.taxonomy.application.CreateCategoryUC
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.ports.CategoryRepository

class CategorizeLedgerTransactionService(
  private val categoryRepository: CategoryRepository,
  private val createCategoryUC: CreateCategoryUC,
  private val processCategorizationUC: ProcessTransactionCategorizationUC,
) : CategorizeLedgerTransactionUC {
  override fun execute(command: CategorizeLedgerTransactionCommand): TxCategorizationState {
    val newCategoryName = command.newCategoryName?.trim().orEmpty()
    val hasNewCategory = newCategoryName.isNotBlank()
    val hasCategoryId = command.categoryId != null

    require(!(hasCategoryId && hasNewCategory)) {
      "Provide either categoryId or newCategoryName, not both"
    }

    val normalizedType = command.transactionType.trim().lowercase()
    val expectedAppliesTo = CategoryAppliesTo.from(normalizedType)

    val resolvedCategoryId = when {
      hasCategoryId -> requireExistingCategory(
        categoryId = command.categoryId,
        expectedAppliesTo = expectedAppliesTo,
        transactionType = normalizedType,
      )
      hasNewCategory -> createCategoryUC.execute(
        CreateCategoryCommand(
          name = newCategoryName,
          appliesTo = expectedAppliesTo,
          createdAt = command.requestedAt,
        ),
      )
      else -> null
    }

    val state = processCategorizationUC.execute(
      ProcessTransactionCategorizationCommand(
        transactionId = command.transactionId.value,
        transactionType = normalizedType,
        requestedCategoryId = resolvedCategoryId,
        processedAt = command.requestedAt,
      ),
    )

    if (state.status == CategorizationStatus.FAILED) {
      val message = buildString {
        append("Categorization failed")
        if (!state.errorCode.isNullOrBlank()) {
          append(": ")
          append(state.errorCode)
        } else if (!state.errorMessage.isNullOrBlank()) {
          append(": ")
          append(state.errorMessage)
        }
      }
      throw IllegalStateException(message)
    }

    return state
  }

  private fun requireExistingCategory(
    categoryId: CategoryId,
    expectedAppliesTo: CategoryAppliesTo,
    transactionType: String,
  ): CategoryId {
    val category = categoryRepository.findById(categoryId)
      ?: throw IllegalStateException("Category not found: $categoryId")
    category.ensureCanAssign()
    require(category.appliesTo == expectedAppliesTo) {
      "Category $categoryId applies to ${category.appliesTo.value}, received $transactionType"
    }
    return category.id
  }
}
