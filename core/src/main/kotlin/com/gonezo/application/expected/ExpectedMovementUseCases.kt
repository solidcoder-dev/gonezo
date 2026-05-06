package com.gonezo.expected.application

import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId
import java.math.BigDecimal
import java.time.Instant

data class CreateExpectedMovementCommand(
  val accountId: String,
  val type: String,
  val amount: BigDecimal,
  val currency: String,
  val expectedAt: Instant,
  val description: String?,
  val merchant: String?,
  val categoryId: String?,
  val originOccurrenceId: String? = null,
  val splitItems: List<ExpectedMovement.SplitItem> = emptyList(),
  val createdAt: Instant,
)

interface CreateExpectedMovementUC {
  fun execute(command: CreateExpectedMovementCommand): ExpectedMovementId
}

data class UpdateExpectedMovementCommand(
  val expectedMovementId: ExpectedMovementId,
  val accountId: String,
  val type: String,
  val amount: BigDecimal,
  val currency: String,
  val expectedAt: Instant,
  val description: String?,
  val merchant: String?,
  val categoryId: String?,
  val splitItems: List<ExpectedMovement.SplitItem> = emptyList(),
  val updatedAt: Instant,
)

interface UpdateExpectedMovementUC {
  fun execute(command: UpdateExpectedMovementCommand)
}

data class ResolveExpectedMovementCommand(
  val expectedMovementId: ExpectedMovementId,
  val transactionId: String,
  val resolvedAt: Instant,
)

interface ResolveExpectedMovementUC {
  fun execute(command: ResolveExpectedMovementCommand)
}

data class DismissExpectedMovementCommand(
  val expectedMovementId: ExpectedMovementId,
  val dismissedAt: Instant,
)

interface DismissExpectedMovementUC {
  fun execute(command: DismissExpectedMovementCommand)
}

data class ListExpectedMovementsQuery(
  val accountId: String,
  val includeClosed: Boolean = false,
)

data class ExpectedMovementView(
  val id: String,
  val accountId: String,
  val type: String,
  val amount: String,
  val currency: String,
  val expectedAt: Instant,
  val description: String?,
  val merchant: String?,
  val categoryId: String?,
  val originOccurrenceId: String?,
  val splitItems: List<SplitItem>,
  val status: String,
  val resolvedTransactionId: String?,
  val createdAt: Instant,
  val updatedAt: Instant,
  val resolvedAt: Instant?,
  val dismissedAt: Instant?,
){
  data class SplitItem(
    val id: String,
    val name: String,
    val amount: String,
  )
}

interface ListExpectedMovementsUC {
  fun execute(query: ListExpectedMovementsQuery): List<ExpectedMovementView>
}
