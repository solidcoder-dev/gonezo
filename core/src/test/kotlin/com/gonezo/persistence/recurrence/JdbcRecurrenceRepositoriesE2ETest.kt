package com.gonezo.persistence.recurrence

import com.gonezo.recurrence.application.RecurringMovementDueIntegrationEvent
import com.gonezo.recurrence.domain.MonthlyPattern
import com.gonezo.recurrence.domain.RecurrenceCadenceSnapshot
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceOutboxMessage
import com.gonezo.recurrence.domain.RecurrenceOutboxStatus
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.recurrence.domain.SchedulingKind
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import com.gonezo.recurrence.infrastructure.persistence.JdbcRecurrenceOutboxRepository
import com.gonezo.recurrence.infrastructure.persistence.JdbcRecurringMovementOccurrenceRepository
import com.gonezo.recurrence.infrastructure.persistence.JdbcRecurringMovementRepository
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

class JdbcRecurrenceRepositoriesE2ETest : SqliteE2ETest() {
    private val scheduleCalculator = RecurrenceScheduleCalculator()

    @Test
    fun `persists recurring movement occurrences and outbox payload`() {
        val recurringMovementRepository = JdbcRecurringMovementRepository(db.namedJdbcTemplate)
        val occurrenceRepository = JdbcRecurringMovementOccurrenceRepository(db.namedJdbcTemplate)
        val outboxRepository = JdbcRecurrenceOutboxRepository(db.namedJdbcTemplate)

        val movement =
            RecurringMovement.create(
                id = RecurringMovementId.random(),
                type = RecurringMovementType.EXPENSE,
                sourceAccountId = "acc-wallet",
                targetAccountId = null,
                amount = BigDecimal("55.00"),
                currency = "USD",
                destinationAmount = null,
                destinationCurrency = null,
                exchangeRate = null,
                description = "Rent",
                merchant = "Landlord",
                categoryId = "cat-rent",
                tagNames = listOf("home"),
                tagIds = listOf("tag-home", "tag-life"),
                rule =
                RecurrenceRule(
                    frequency = com.gonezo.recurrence.domain.RecurrenceFrequency.MONTHLY,
                    monthlyPattern = MonthlyPattern.NTH_WEEKDAY,
                    monthlyWeekOrdinal = 3,
                    monthlyWeekday = DayOfWeek.THURSDAY,
                ),
                recurrenceEnd = RecurrenceEnd.AfterOccurrences(1),
                startAt = Instant.parse("2026-02-01T09:00:00Z"),
                zoneId = "UTC",
                createdAt = Instant.parse("2026-02-01T09:00:00Z"),
                scheduleCalculator = scheduleCalculator,
            )
        recurringMovementRepository.save(movement)

        val due = recurringMovementRepository.findDue(Instant.parse("2026-03-20T00:00:00Z"), 10)
        assertThat(due).hasSize(1)
        assertThat(due.first().rule.monthlyPattern).isEqualTo(MonthlyPattern.NTH_WEEKDAY)
        assertThat(due.first().categoryId).isEqualTo("cat-rent")
        assertThat(due.first().tagIds).containsExactly("tag-home", "tag-life")
        assertThat(due.first().tagNames).containsExactly("home")

        val occurrence =
            RecurringMovementOccurrence.pending(
                id = UUID.randomUUID(),
                recurringMovementId = movement.id,
                dueAt = requireNotNull(movement.nextDueAt),
                createdAt = Instant.parse("2026-02-19T09:00:00Z"),
                schedulingKind = movement.schedulingKind,
            )
        occurrenceRepository.save(occurrence)

        val loadedOccurrence = occurrenceRepository.findByRecurringMovementAndDueAt(movement.id, requireNotNull(movement.nextDueAt))
        assertThat(loadedOccurrence).isNotNull()
        assertThat(loadedOccurrence!!.status.value).isEqualTo("pending")
        assertThat(loadedOccurrence.schedulingKind.value).isEqualTo("one_shot")
        val postedOccurrence = loadedOccurrence.acknowledgePosted("transaction-1", Instant.parse("2026-02-19T10:00:00Z"))
        occurrenceRepository.save(postedOccurrence)
        assertThat(occurrenceRepository.findByLedgerTransactionId("transaction-1")).isEqualTo(postedOccurrence)

        val cadenceOccurrence = RecurringMovementOccurrence.pending(
            id = UUID.randomUUID(),
            recurringMovementId = movement.id,
            dueAt = requireNotNull(movement.nextDueAt).plusSeconds(1),
            createdAt = Instant.parse("2026-02-19T09:00:00Z"),
            schedulingKind = SchedulingKind.RECURRING,
            cadence = RecurrenceCadenceSnapshot(RecurrenceFrequency.MONTHLY, 3),
        )
        occurrenceRepository.save(cadenceOccurrence)
        assertThat(occurrenceRepository.findById(cadenceOccurrence.id)?.cadence)
            .isEqualTo(RecurrenceCadenceSnapshot(RecurrenceFrequency.MONTHLY, 3))

        val outboxMessage =
            RecurrenceOutboxMessage(
                id = UUID.randomUUID(),
                aggregateId = movement.id,
                occurrenceId = occurrence.id,
                eventType = RecurringMovementDueIntegrationEvent.EVENT_TYPE,
                payloadJson =
                RecurringMovementDueIntegrationEvent(
                    eventId = UUID.randomUUID(),
                    recurringMovementId = movement.id.toString(),
                    occurrenceId = occurrence.id.toString(),
                    dueAt = requireNotNull(movement.nextDueAt).toString(),
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
                createdAt = Instant.parse("2026-02-19T09:00:00Z"),
                publishedAt = null,
            )
        outboxRepository.save(outboxMessage)

        val loadedOutbox = outboxRepository.findById(outboxMessage.id)
        assertThat(loadedOutbox).isNotNull()
        assertThat(loadedOutbox!!.eventType).isEqualTo(RecurringMovementDueIntegrationEvent.EVENT_TYPE)
    }
}
