package com.gonezo.recurrence.domain

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class RecurrenceCadenceSnapshotTest {
    @Test
    fun `captures frequency and interval independently of a later rule edit`() {
        val snapshot = RecurrenceCadenceSnapshot.from(RecurrenceRule(RecurrenceFrequency.MONTHLY, interval = 3))
        val changedRule = RecurrenceRule(RecurrenceFrequency.YEARLY)
        val occurrence = RecurringMovementOccurrence.pending(
            UUID.randomUUID(),
            RecurringMovementId.random(),
            Instant.parse("2026-01-01T00:00:00Z"),
            Instant.parse("2026-01-01T00:00:00Z"),
            SchedulingKind.RECURRING,
            snapshot,
        )

        assertThat(snapshot.frequency).isEqualTo(RecurrenceFrequency.MONTHLY)
        assertThat(snapshot.interval).isEqualTo(3)
        assertThat(occurrence.cadence).isEqualTo(snapshot)
        assertThat(RecurrenceCadenceSnapshot.from(changedRule)).isEqualTo(RecurrenceCadenceSnapshot(RecurrenceFrequency.YEARLY, 1))
    }

    @Test
    fun `pending recurring occurrences can snapshot cadence while one shot and legacy rows remain unknown`() {
        val id = RecurringMovementId.random()
        val at = Instant.parse("2026-01-01T00:00:00Z")
        val cadence = RecurrenceCadenceSnapshot(RecurrenceFrequency.WEEKLY, 2)
        val recurring = RecurringMovementOccurrence.pending(UUID.randomUUID(), id, at, at, SchedulingKind.RECURRING, cadence)
        val oneShot = RecurringMovementOccurrence.pending(UUID.randomUUID(), id, at, at, SchedulingKind.ONE_SHOT)
        val legacy = RecurringMovementOccurrence.pending(UUID.randomUUID(), id, at, at, SchedulingKind.RECURRING)

        assertThat(recurring.acknowledgePosted("transaction", at).cadence).isEqualTo(cadence)
        assertThat(oneShot.cadence).isNull()
        assertThat(legacy.cadence).isNull()
    }

    @Test
    fun `cadence interval must be positive`() {
        assertThatThrownBy { RecurrenceCadenceSnapshot(RecurrenceFrequency.DAILY, 0) }
            .isInstanceOf(IllegalArgumentException::class.java)
    }
}
