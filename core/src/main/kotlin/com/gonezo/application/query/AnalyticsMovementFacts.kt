package com.gonezo.application.query

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.time.Instant
import java.time.ZoneId

enum class AnalyticsMovementSource {
  POSTED,
  EXPECTED,
  SCHEDULED_PROJECTION,
}

enum class AnalyticsMovementType {
  INCOME,
  EXPENSE,
  TRANSFER_IN,
  TRANSFER_OUT,
}

data class AnalyticsMovementIdentity(val value: String) {
  init {
    require(value.isNotBlank()) { "analytics movement identity is required" }
  }

  companion object {
    fun posted(transactionId: String): AnalyticsMovementIdentity = stable("posted", transactionId)

    fun expected(expectedId: String, originOccurrenceId: String?, originRecurringMovementId: String?): AnalyticsMovementIdentity =
      when {
        !originOccurrenceId.isNullOrBlank() -> stable("occurrence", originOccurrenceId)
        !originRecurringMovementId.isNullOrBlank() -> stable("expected-series", originRecurringMovementId, expectedId)
        else -> stable("expected", expectedId)
      }

    fun scheduled(recurringMovementId: String, occurrenceNumber: Int): AnalyticsMovementIdentity =
      stable("occurrence", recurringMovementId, occurrenceNumber.toString())

    private fun stable(kind: String, vararg parts: String): AnalyticsMovementIdentity =
      AnalyticsMovementIdentity(listOf(kind, *parts).joinToString("/"))
  }
}

data class AnalyticsMovementFact(
  val identity: AnalyticsMovementIdentity,
  val source: AnalyticsMovementSource,
  val effectiveAt: Instant,
  val accountId: String,
  val type: AnalyticsMovementType,
  val currency: CurrencyCode,
  val personalAmount: Money,
  val fullAmount: Money,
  val ignored: Boolean,
  val categoryId: String?,
  val tagIds: Set<String>,
)

object AnalyticsMovementDeduplicator {
  fun select(facts: Iterable<AnalyticsMovementFact>): List<AnalyticsMovementFact> = facts
    .groupBy(AnalyticsMovementFact::identity)
    .values
    .map { candidates -> candidates.maxWith(priorityComparator) }
    .sortedWith(compareBy<AnalyticsMovementFact> { it.effectiveAt }.thenBy { it.identity.value })

  private val priorityComparator = compareBy<AnalyticsMovementFact> { sourcePriority(it.source) }
    .thenByDescending { it.effectiveAt }
    .thenBy { it.identity.value }

  private fun sourcePriority(source: AnalyticsMovementSource): Int = when (source) {
    AnalyticsMovementSource.POSTED -> 3
    AnalyticsMovementSource.EXPECTED -> 2
    AnalyticsMovementSource.SCHEDULED_PROJECTION -> 1
  }
}

data class AnalyticsScheduledOccurrence(
  val identity: AnalyticsMovementIdentity,
  val effectiveAt: Instant,
  val sourceAccountId: String,
  val targetAccountId: String?,
  val occurrenceNumber: Int,
)

class AnalyticsScheduledOccurrenceProjector(
  private val scheduleCalculator: RecurrenceScheduleCalculator = RecurrenceScheduleCalculator(),
) {
  fun project(
    movement: RecurringMovement,
    fromInclusive: Instant,
    toExclusive: Instant,
  ): List<AnalyticsScheduledOccurrence> {
    require(fromInclusive < toExclusive) { "analytics window must be non-empty" }
    if (movement.status != RecurringMovementStatus.ACTIVE) return emptyList()

    val occurrences = mutableListOf<AnalyticsScheduledOccurrence>()
    var dueAt = scheduleCalculator.firstDueAt(movement.startAt, movement.zoneId, movement.rule)
    var occurrenceNumber = 1
    while (dueAt < toExclusive) {
      if (dueAt >= fromInclusive && isAllowedOccurrence(movement, dueAt, occurrenceNumber)) {
        occurrences += AnalyticsScheduledOccurrence(
          identity = AnalyticsMovementIdentity.scheduled(movement.id.toString(), occurrenceNumber),
          effectiveAt = dueAt,
          sourceAccountId = movement.sourceAccountId,
          targetAccountId = movement.targetAccountId,
          occurrenceNumber = occurrenceNumber,
        )
      }
      occurrenceNumber += 1
      dueAt = scheduleCalculator.nextDueAt(movement.startAt, movement.zoneId, dueAt, movement.rule)
    }
    return occurrences
  }

  private fun isAllowedOccurrence(movement: RecurringMovement, dueAt: Instant, occurrenceNumber: Int): Boolean {
    if (occurrenceNumber <= movement.generatedOccurrences) return false
    val localDate = dueAt.atZone(ZoneId.of(movement.zoneId)).toLocalDate()
    return when (val end = movement.recurrenceEnd) {
      RecurrenceEnd.Never -> true
      is RecurrenceEnd.OnDate -> !localDate.isAfter(end.date)
      is RecurrenceEnd.AfterOccurrences -> occurrenceNumber <= end.count
    }
  }
}
