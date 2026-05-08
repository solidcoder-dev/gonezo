package com.gonezo.application.orchestration

import com.gonezo.taxonomy.domain.CategoryId
import java.time.Instant
import java.util.UUID

enum class CategorizationStatus(val value: String) {
  PENDING("pending"),
  PROCESSING("processing"),
  ASSIGNED("assigned"),
  FAILED("failed"),
  NONE("none"),
  ;

  companion object {
    fun from(value: String): CategorizationStatus =
      entries.firstOrNull { it.value.equals(value, ignoreCase = true) }
        ?: throw IllegalArgumentException("Unsupported categorization status: $value")
  }
}

data class TxCategorizationState(
  val transactionId: UUID,
  val requestedCategoryId: CategoryId?,
  val status: CategorizationStatus,
  val errorCode: String?,
  val errorMessage: String?,
  val attempts: Int,
  val nextAttemptAt: Instant?,
  val updatedAt: Instant,
  val createdAt: Instant,
)

interface TxCategorizationStateRepository {
  fun upsert(state: TxCategorizationState)

  fun findByTransactionId(transactionId: UUID): TxCategorizationState?

  fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, TxCategorizationState>

  fun deleteByTransactionIds(transactionIds: Collection<UUID>)

  fun findPending(now: Instant, limit: Int): List<TxCategorizationState>
}

data class ProcessTransactionCategorizationCommand(
  val transactionId: UUID,
  val transactionType: String,
  val requestedCategoryId: CategoryId?,
  val processedAt: Instant,
)

interface ProcessTransactionCategorizationUC {
  fun execute(command: ProcessTransactionCategorizationCommand): TxCategorizationState
}
