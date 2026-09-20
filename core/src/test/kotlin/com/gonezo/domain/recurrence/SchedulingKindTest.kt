package com.gonezo.domain.recurrence

import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.SchedulingKind
import com.gonezo.recurrence.domain.resolveCurrentSchedulingKind
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class SchedulingKindTest {
    @Test
    fun `one occurrence current plan is one shot and other plans are recurring`() {
        assertThat(resolveCurrentSchedulingKind(RecurrenceEnd.AfterOccurrences(1))).isEqualTo(SchedulingKind.ONE_SHOT)
        assertThat(resolveCurrentSchedulingKind(RecurrenceEnd.AfterOccurrences(2))).isEqualTo(SchedulingKind.RECURRING)
        assertThat(resolveCurrentSchedulingKind(RecurrenceEnd.Never)).isEqualTo(SchedulingKind.RECURRING)
    }

    @Test
    fun `occurrence keeps scheduling kind when parent plan changes`() {
        val initialPlan = RecurrenceEnd.AfterOccurrences(1)
        val occurrence = com.gonezo.recurrence.domain.RecurringMovementOccurrence.pending(
            id = UUID.fromString("00000000-0000-4000-8000-000000000041"),
            recurringMovementId = com.gonezo.recurrence.domain.RecurringMovementId.random(),
            dueAt = Instant.parse("2026-01-01T00:00:00Z"),
            createdAt = Instant.parse("2026-01-01T00:00:00Z"),
            schedulingKind = resolveCurrentSchedulingKind(initialPlan),
        )

        val updatedPlanKind = resolveCurrentSchedulingKind(RecurrenceEnd.Never)

        assertThat(updatedPlanKind).isEqualTo(SchedulingKind.RECURRING)
        assertThat(occurrence.schedulingKind).isEqualTo(SchedulingKind.ONE_SHOT)
    }
}
