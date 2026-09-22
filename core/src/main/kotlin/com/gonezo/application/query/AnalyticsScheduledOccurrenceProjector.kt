package com.gonezo.application.query

import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.time.Instant
import java.time.ZoneId

data class AnalyticsScheduledOccurrence(val identity: AnalyticsMovementIdentity, val effectiveAt: Instant, val sourceAccountId: String, val targetAccountId: String?, val occurrenceNumber: Int, val originOccurrenceId: String? = null)

class AnalyticsScheduledOccurrenceProjector(private val scheduleCalculator: RecurrenceScheduleCalculator = RecurrenceScheduleCalculator()) {
    fun project(movement: RecurringMovement, fromInclusive: Instant, toExclusive: Instant, occurrenceIdFor: (Instant, Int) -> String? = { _, _ -> null }): List<AnalyticsScheduledOccurrence> {
        require(fromInclusive < toExclusive) { "analytics window must be non-empty" }
        if (movement.status != RecurringMovementStatus.ACTIVE) return emptyList()
        val occurrences = mutableListOf<AnalyticsScheduledOccurrence>()
        var dueAt = scheduleCalculator.firstDueAt(movement.startAt, movement.zoneId, movement.rule)
        var occurrenceNumber = 1
        while (dueAt < toExclusive) {
            if (dueAt >= fromInclusive && isAllowedOccurrence(movement, dueAt, occurrenceNumber)) {
                val originOccurrenceId = occurrenceIdFor(dueAt, occurrenceNumber)
                occurrences += AnalyticsScheduledOccurrence(
                    identity = originOccurrenceId?.let(AnalyticsMovementIdentity::scheduled) ?: AnalyticsMovementIdentity.scheduled(movement.id.toString(), occurrenceNumber),
                    effectiveAt = dueAt,
                    sourceAccountId = movement.sourceAccountId,
                    targetAccountId = movement.targetAccountId,
                    occurrenceNumber = occurrenceNumber,
                    originOccurrenceId = originOccurrenceId,
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
