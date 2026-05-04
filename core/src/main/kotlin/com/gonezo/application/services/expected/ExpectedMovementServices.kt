package com.gonezo.expected.application

import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementType
import com.gonezo.expected.domain.ports.ExpectedMovementRepository

class CreateExpectedMovementService(
  private val repository: ExpectedMovementRepository,
) : CreateExpectedMovementUC {
  override fun execute(command: CreateExpectedMovementCommand): ExpectedMovementId {
    val movement = ExpectedMovement.create(
      id = ExpectedMovementId.random(),
      accountId = command.accountId,
      type = ExpectedMovementType.from(command.type),
      amount = command.amount,
      currency = command.currency,
      expectedAt = command.expectedAt,
      description = command.description,
      merchant = command.merchant,
      categoryId = command.categoryId,
      originOccurrenceId = command.originOccurrenceId,
      createdAt = command.createdAt,
    )
    repository.save(movement)
    return movement.id
  }
}

class ResolveExpectedMovementService(
  private val repository: ExpectedMovementRepository,
) : ResolveExpectedMovementUC {
  override fun execute(command: ResolveExpectedMovementCommand) {
    val movement = requireExpectedMovement(repository, command.expectedMovementId)
    repository.save(movement.resolve(command.transactionId, command.resolvedAt))
  }
}

class DismissExpectedMovementService(
  private val repository: ExpectedMovementRepository,
) : DismissExpectedMovementUC {
  override fun execute(command: DismissExpectedMovementCommand) {
    val movement = requireExpectedMovement(repository, command.expectedMovementId)
    repository.save(movement.dismiss(command.dismissedAt))
  }
}

class ListExpectedMovementsService(
  private val repository: ExpectedMovementRepository,
) : ListExpectedMovementsUC {
  override fun execute(query: ListExpectedMovementsQuery): List<ExpectedMovementView> =
    repository.listByAccount(query.accountId, query.includeClosed).map { movement ->
      ExpectedMovementView(
        id = movement.id.toString(),
        accountId = movement.accountId,
        type = movement.type.value,
        amount = movement.amount.toPlainString(),
        currency = movement.currency,
        expectedAt = movement.expectedAt,
        description = movement.description,
        merchant = movement.merchant,
        categoryId = movement.categoryId,
        originOccurrenceId = movement.originOccurrenceId,
        status = movement.status.value,
        resolvedTransactionId = movement.resolvedTransactionId,
        createdAt = movement.createdAt,
        updatedAt = movement.updatedAt,
        resolvedAt = movement.resolvedAt,
        dismissedAt = movement.dismissedAt,
      )
    }
}

private fun requireExpectedMovement(
  repository: ExpectedMovementRepository,
  id: ExpectedMovementId,
): ExpectedMovement = repository.findById(id)
  ?: throw IllegalStateException("Expected movement not found: $id")
