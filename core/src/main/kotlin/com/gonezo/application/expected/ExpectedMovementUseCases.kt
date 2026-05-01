package com.gonezo.expected.application

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
  val createdAt: Instant,
)

interface CreateExpectedMovementUC {
  fun execute(command: CreateExpectedMovementCommand): ExpectedMovementId
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
  val status: String,
  val resolvedTransactionId: String?,
  val createdAt: Instant,
  val updatedAt: Instant,
  val resolvedAt: Instant?,
  val dismissedAt: Instant?,
)

interface ListExpectedMovementsUC {
  fun execute(query: ListExpectedMovementsQuery): List<ExpectedMovementView>
}
