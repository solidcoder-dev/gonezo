package com.gonezo.recurrence.application

import com.gonezo.recurrence.domain.RecurrenceOutboxMessage
import com.gonezo.recurrence.domain.RecurrenceOutboxStatus
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.recurrence.domain.ports.RecurrenceOutboxRepository
import com.gonezo.recurrence.domain.ports.RecurringMovementOccurrenceRepository
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.time.Instant
import java.util.UUID

class CreateRecurringMovementService(
  private val recurringMovementRepository: RecurringMovementRepository,
  private val scheduleCalculator: RecurrenceScheduleCalculator,
) : CreateRecurringMovementUC {
  override fun execute(command: CreateRecurringMovementCommand): RecurringMovementId {
    val movementId = RecurringMovementId.random()
    val movement = RecurringMovement.create(
      id = movementId,
      type = command.type,
      sourceAccountId = command.sourceAccountId,
      targetAccountId = command.targetAccountId,
      amount = command.amount,
      currency = command.currency,
      destinationAmount = command.destinationAmount,
      destinationCurrency = command.destinationCurrency,
      exchangeRate = command.exchangeRate,
      description = command.description,
      merchant = command.merchant,
      rule = command.rule,
      recurrenceEnd = command.recurrenceEnd,
      startAt = command.startAt,
      zoneId = command.zoneId,
      createdAt = command.createdAt,
      scheduleCalculator = scheduleCalculator,
    )
    recurringMovementRepository.save(movement)
    return movement.id
  }
}

class DeactivateRecurringMovementService(
  private val recurringMovementRepository: RecurringMovementRepository,
) : DeactivateRecurringMovementUC {
  override fun execute(command: DeactivateRecurringMovementCommand) {
    val movement = requireRecurringMovement(recurringMovementRepository, command.recurringMovementId)
    recurringMovementRepository.save(movement.deactivate(command.deactivatedAt))
  }
}

class ListRecurringMovementsByAccountService(
  private val recurringMovementRepository: RecurringMovementRepository,
) : ListRecurringMovementsByAccountUC {
  override fun execute(query: ListRecurringMovementsByAccountQuery): List<RecurringMovementView> =
    recurringMovementRepository.listBySourceAccount(query.sourceAccountId).map { movement ->
      RecurringMovementView(
        id = movement.id.toString(),
        type = movement.type.value,
        sourceAccountId = movement.sourceAccountId,
        targetAccountId = movement.targetAccountId,
        amount = movement.amount.toPlainString(),
        currency = movement.currency,
        destinationAmount = movement.destinationAmount?.toPlainString(),
        destinationCurrency = movement.destinationCurrency,
        exchangeRate = movement.exchangeRate?.toPlainString(),
        description = movement.description,
        merchant = movement.merchant,
        nextDueAt = movement.nextDueAt,
        status = movement.status.value,
        generatedOccurrences = movement.generatedOccurrences,
      )
    }
}

class ProcessDueRecurringMovementsService(
  private val recurringMovementRepository: RecurringMovementRepository,
  private val occurrenceRepository: RecurringMovementOccurrenceRepository,
  private val outboxRepository: RecurrenceOutboxRepository,
  private val scheduleCalculator: RecurrenceScheduleCalculator,
) : ProcessDueRecurringMovementsUC {
  override fun execute(command: ProcessDueRecurringMovementsCommand): ProcessDueRecurringMovementsResult {
    require(command.limit > 0) { "limit must be greater than 0" }

    val dueMovements = recurringMovementRepository.findDue(command.now, command.limit)
    var createdOccurrences = 0
    var advancedSchedules = 0

    dueMovements.forEach { movement ->
      val dueAt = checkNotNull(movement.nextDueAt) { "Active recurring movement must have nextDueAt" }

      val existingOccurrence = occurrenceRepository.findByRecurringMovementAndDueAt(movement.id, dueAt)
      if (existingOccurrence == null) {
        val occurrence = RecurringMovementOccurrence.pending(
          id = UUID.randomUUID(),
          recurringMovementId = movement.id,
          dueAt = dueAt,
          createdAt = command.now,
        )
        occurrenceRepository.save(occurrence)
        outboxRepository.save(
          RecurrenceOutboxMessage(
            id = UUID.randomUUID(),
            aggregateId = movement.id,
            occurrenceId = occurrence.id,
            eventType = RecurringMovementDueIntegrationEvent.EVENT_TYPE,
            payloadJson = RecurringMovementDueIntegrationEvent(
              eventId = UUID.randomUUID(),
              recurringMovementId = movement.id.toString(),
              occurrenceId = occurrence.id.toString(),
              dueAt = dueAt.toString(),
              movementType = movement.type.value,
              sourceAccountId = movement.sourceAccountId,
              targetAccountId = movement.targetAccountId,
              amount = movement.amount.toPlainString(),
              currency = movement.currency,
              destinationAmount = movement.destinationAmount?.toPlainString(),
              destinationCurrency = movement.destinationCurrency,
              exchangeRate = movement.exchangeRate?.toPlainString(),
              description = movement.description,
              merchant = movement.merchant,
            ).toJson(),
            status = RecurrenceOutboxStatus.PENDING,
            attempts = 0,
            lastError = null,
            createdAt = command.now,
            publishedAt = null,
          ),
        )
        createdOccurrences += 1
      }

      val advanced = movement.advanceAfterDue(
        dueAt = dueAt,
        advancedAt = command.now,
        scheduleCalculator = scheduleCalculator,
      )
      recurringMovementRepository.save(advanced)
      advancedSchedules += 1
    }

    return ProcessDueRecurringMovementsResult(
      scanned = dueMovements.size,
      createdOccurrences = createdOccurrences,
      advancedSchedules = advancedSchedules,
    )
  }
}

private fun requireRecurringMovement(
  recurringMovementRepository: RecurringMovementRepository,
  recurringMovementId: RecurringMovementId,
): RecurringMovement = recurringMovementRepository.findById(recurringMovementId)
  ?: throw IllegalStateException("Recurring movement not found: $recurringMovementId")
