package com.gonezo.application.services.workflows

import com.gonezo.application.taxonomy.AssignCategoryToTransactionCommand
import com.gonezo.application.taxonomy.AssignCategoryToTransactionUC
import com.gonezo.application.workflows.CategorizationStatus
import com.gonezo.application.workflows.ProcessTransactionCategorizationCommand
import com.gonezo.application.workflows.ProcessTransactionCategorizationUC
import com.gonezo.application.workflows.TxCategorizationState
import com.gonezo.application.workflows.TxCategorizationStateRepository

class ProcessTransactionCategorizationService(
  private val taxonomyAssignCategoryUC: AssignCategoryToTransactionUC,
  private val stateRepository: TxCategorizationStateRepository,
) : ProcessTransactionCategorizationUC {
  override fun execute(command: ProcessTransactionCategorizationCommand): TxCategorizationState {
    val previous = stateRepository.findByTransactionId(command.transactionId)
    val createdAt = previous?.createdAt ?: command.processedAt

    if (command.requestedCategoryId == null) {
      return TxCategorizationState(
        transactionId = command.transactionId,
        requestedCategoryId = null,
        status = CategorizationStatus.NONE,
        errorCode = null,
        errorMessage = null,
        attempts = previous?.attempts ?: 0,
        nextAttemptAt = null,
        updatedAt = command.processedAt,
        createdAt = createdAt,
      ).also(stateRepository::upsert)
    }

    val attempts = (previous?.attempts ?: 0) + 1
    val normalizedType = command.transactionType.trim().lowercase()
    if (normalizedType.startsWith("transfer")) {
      return failedState(
        command = command,
        attempts = attempts,
        createdAt = createdAt,
        code = "CATEGORY_NOT_ALLOWED_FOR_TRANSFER",
        message = "Transfers cannot be categorized",
      ).also(stateRepository::upsert)
    }

    val pending = TxCategorizationState(
      transactionId = command.transactionId,
      requestedCategoryId = command.requestedCategoryId,
      status = CategorizationStatus.PENDING,
      errorCode = null,
      errorMessage = null,
      attempts = attempts,
      nextAttemptAt = null,
      updatedAt = command.processedAt,
      createdAt = createdAt,
    )
    stateRepository.upsert(pending)

    return try {
      taxonomyAssignCategoryUC.execute(
        AssignCategoryToTransactionCommand(
          transactionId = command.transactionId,
          categoryId = command.requestedCategoryId,
          transactionType = normalizedType,
          assignedAt = command.processedAt,
        ),
      )

      pending.copy(
        status = CategorizationStatus.ASSIGNED,
        errorCode = null,
        errorMessage = null,
        updatedAt = command.processedAt,
      ).also(stateRepository::upsert)
    } catch (ex: RuntimeException) {
      failedState(
        command = command,
        attempts = attempts,
        createdAt = createdAt,
        code = toErrorCode(ex),
        message = ex.message ?: "Categorization failed",
      ).also(stateRepository::upsert)
    }
  }

  private fun failedState(
    command: ProcessTransactionCategorizationCommand,
    attempts: Int,
    createdAt: java.time.Instant,
    code: String,
    message: String,
  ): TxCategorizationState = TxCategorizationState(
    transactionId = command.transactionId,
    requestedCategoryId = command.requestedCategoryId,
    status = CategorizationStatus.FAILED,
    errorCode = code,
    errorMessage = message,
    attempts = attempts,
    nextAttemptAt = null,
    updatedAt = command.processedAt,
    createdAt = createdAt,
  )

  private fun toErrorCode(ex: RuntimeException): String {
    val raw = ex.message?.trim().orEmpty()
    if (raw.isBlank()) {
      return "CATEGORIZATION_FAILED"
    }
    val normalized = raw.uppercase().replace(Regex("[^A-Z0-9]+"), "_").trim('_')
    return if (normalized.isBlank()) "CATEGORIZATION_FAILED" else normalized
  }
}
