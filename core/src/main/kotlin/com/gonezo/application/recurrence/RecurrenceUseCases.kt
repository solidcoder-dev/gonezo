package com.gonezo.recurrence.application

import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.recurrence.domain.RecurringMovementType
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class CreateRecurringMovementCommand(
  val type: RecurringMovementType,
  val sourceAccountId: String,
  val targetAccountId: String?,
  val amount: BigDecimal,
  val currency: String,
  val destinationAmount: BigDecimal?,
  val destinationCurrency: String?,
  val exchangeRate: BigDecimal?,
  val description: String?,
  val merchant: String?,
  val categoryId: String? = null,
  val splitItems: List<RecurringMovement.SplitItem> = emptyList(),
  val rule: RecurrenceRule,
  val recurrenceEnd: RecurrenceEnd,
  val startAt: Instant,
  val zoneId: String,
  val createdAt: Instant,
)

interface CreateRecurringMovementUC {
  fun execute(command: CreateRecurringMovementCommand): RecurringMovementId
}

data class DeactivateRecurringMovementCommand(
  val recurringMovementId: RecurringMovementId,
  val deactivatedAt: Instant,
)

interface DeactivateRecurringMovementUC {
  fun execute(command: DeactivateRecurringMovementCommand)
}

data class ProcessDueRecurringMovementsCommand(
  val now: Instant,
  val limit: Int = 100,
)

data class ProcessDueRecurringMovementsResult(
  val scanned: Int,
  val createdOccurrences: Int,
  val advancedSchedules: Int,
)

interface ProcessDueRecurringMovementsUC {
  fun execute(command: ProcessDueRecurringMovementsCommand): ProcessDueRecurringMovementsResult
}

enum class AcknowledgeRecurringMovementOccurrenceStatus {
  POSTED,
  FAILED,
}

data class AcknowledgeRecurringMovementOccurrenceCommand(
  val occurrenceId: UUID,
  val status: AcknowledgeRecurringMovementOccurrenceStatus,
  val ledgerTransactionId: String?,
  val errorCode: String?,
  val errorMessage: String?,
  val acknowledgedAt: Instant,
)

interface AcknowledgeRecurringMovementOccurrenceUC {
  fun execute(command: AcknowledgeRecurringMovementOccurrenceCommand): RecurringMovementOccurrence
}

data class PublishRecurrenceOutboxCommand(
  val limit: Int = 100,
  val publishedAt: Instant,
)

data class PublishRecurrenceOutboxResult(
  val processed: Int,
  val published: Int,
  val failed: Int,
)

interface PublishRecurrenceOutboxUC {
  fun execute(command: PublishRecurrenceOutboxCommand): PublishRecurrenceOutboxResult
}

data class ListRecurringMovementsByAccountQuery(
  val sourceAccountId: String,
)

interface ListRecurringMovementsByAccountUC {
  fun execute(query: ListRecurringMovementsByAccountQuery): List<RecurringMovementView>
}

data class RecurringMovementView(
  val id: String,
  val type: String,
  val sourceAccountId: String,
  val targetAccountId: String?,
  val amount: String,
  val currency: String,
  val destinationAmount: String?,
  val destinationCurrency: String?,
  val exchangeRate: String?,
  val description: String?,
  val merchant: String?,
  val categoryId: String?,
  val splitItems: List<SplitItem>,
  val nextDueAt: Instant?,
  val status: String,
  val generatedOccurrences: Int,
){
  data class SplitItem(
    val id: String,
    val name: String,
    val amount: String,
  )
}
