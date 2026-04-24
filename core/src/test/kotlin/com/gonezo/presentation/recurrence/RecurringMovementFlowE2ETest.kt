package com.gonezo.presentation.recurrence

import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceCommand
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceService
import com.gonezo.recurrence.application.AcknowledgeRecurringMovementOccurrenceStatus
import com.gonezo.recurrence.application.CreateRecurringMovementCommand
import com.gonezo.recurrence.application.CreateRecurringMovementService
import com.gonezo.recurrence.application.DeactivateRecurringMovementCommand
import com.gonezo.recurrence.application.DeactivateRecurringMovementService
import com.gonezo.recurrence.application.ListRecurringMovementsByAccountQuery
import com.gonezo.recurrence.application.ListRecurringMovementsByAccountService
import com.gonezo.recurrence.application.ProcessDueRecurringMovementsCommand
import com.gonezo.recurrence.application.ProcessDueRecurringMovementsService
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovementOccurrenceStatus
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import com.gonezo.recurrence.infrastructure.persistence.JdbcRecurrenceOutboxRepository
import com.gonezo.recurrence.infrastructure.persistence.JdbcRecurringMovementOccurrenceRepository
import com.gonezo.recurrence.infrastructure.persistence.JdbcRecurringMovementRepository
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class RecurringMovementFlowE2ETest : SqliteE2ETest() {
  private val scheduleCalculator = RecurrenceScheduleCalculator()

  @Test
  fun `creates due occurrence, acknowledges posting and deactivates without losing history`() {
    val recurringMovementRepository = JdbcRecurringMovementRepository(db.namedJdbcTemplate)
    val occurrenceRepository = JdbcRecurringMovementOccurrenceRepository(db.namedJdbcTemplate)
    val outboxRepository = JdbcRecurrenceOutboxRepository(db.namedJdbcTemplate)

    val createRecurringMovementUC = CreateRecurringMovementService(recurringMovementRepository, scheduleCalculator)
    val processDueUC = ProcessDueRecurringMovementsService(
      recurringMovementRepository = recurringMovementRepository,
      occurrenceRepository = occurrenceRepository,
      outboxRepository = outboxRepository,
      scheduleCalculator = scheduleCalculator,
    )
    val acknowledgeOccurrenceUC = AcknowledgeRecurringMovementOccurrenceService(occurrenceRepository)
    val deactivateRecurringMovementUC = DeactivateRecurringMovementService(recurringMovementRepository)

    val createdId = createRecurringMovementUC.execute(
      CreateRecurringMovementCommand(
        type = RecurringMovementType.EXPENSE,
        sourceAccountId = "acc-wallet",
        targetAccountId = null,
        amount = BigDecimal("27.50"),
        currency = "USD",
        destinationAmount = null,
        destinationCurrency = null,
        exchangeRate = null,
        description = "Gym",
        merchant = "Gym",
        rule = RecurrenceRule(
          frequency = RecurrenceFrequency.DAILY,
          interval = 1,
        ),
        recurrenceEnd = RecurrenceEnd.Never,
        startAt = Instant.parse("2026-04-10T09:00:00Z"),
        zoneId = "UTC",
        createdAt = Instant.parse("2026-04-10T08:00:00Z"),
      ),
    )

    val processingResult = processDueUC.execute(
      ProcessDueRecurringMovementsCommand(
        now = Instant.parse("2026-04-10T10:00:00Z"),
        limit = 100,
      ),
    )

    assertThat(processingResult.scanned).isEqualTo(1)
    assertThat(processingResult.createdOccurrences).isEqualTo(1)
    assertThat(processingResult.advancedSchedules).isEqualTo(1)

    val recurringMovementAfterProcessing = recurringMovementRepository.findById(createdId)
    assertThat(recurringMovementAfterProcessing).isNotNull()
    assertThat(recurringMovementAfterProcessing!!.generatedOccurrences).isEqualTo(1)
    assertThat(recurringMovementAfterProcessing.status).isEqualTo(RecurringMovementStatus.ACTIVE)
    assertThat(recurringMovementAfterProcessing.nextDueAt).isEqualTo(Instant.parse("2026-04-11T09:00:00Z"))

    val occurrences = occurrenceRepository.listByRecurringMovement(createdId)
    assertThat(occurrences).hasSize(1)
    val firstOccurrence = occurrences.first()
    assertThat(firstOccurrence.status).isEqualTo(RecurringMovementOccurrenceStatus.PENDING)

    val acknowledged = acknowledgeOccurrenceUC.execute(
      AcknowledgeRecurringMovementOccurrenceCommand(
        occurrenceId = firstOccurrence.id,
        status = AcknowledgeRecurringMovementOccurrenceStatus.POSTED,
        ledgerTransactionId = "tx-posted-1",
        errorCode = null,
        errorMessage = null,
        acknowledgedAt = Instant.parse("2026-04-10T10:02:00Z"),
      ),
    )
    assertThat(acknowledged.status).isEqualTo(RecurringMovementOccurrenceStatus.POSTED)
    assertThat(acknowledged.ledgerTransactionId).isEqualTo("tx-posted-1")

    deactivateRecurringMovementUC.execute(
      DeactivateRecurringMovementCommand(
        recurringMovementId = createdId,
        deactivatedAt = Instant.parse("2026-04-10T10:03:00Z"),
      ),
    )

    val recurringMovementAfterDeactivate = recurringMovementRepository.findById(createdId)
    assertThat(recurringMovementAfterDeactivate).isNotNull()
    assertThat(recurringMovementAfterDeactivate!!.status).isEqualTo(RecurringMovementStatus.DEACTIVATED)
    assertThat(recurringMovementAfterDeactivate.nextDueAt).isNull()
    assertThat(recurringMovementAfterDeactivate.generatedOccurrences).isEqualTo(1)

    val occurrenceRows = db.jdbcTemplate.queryForObject(
      "select count(*) from recurring_movement_occurrences where recurring_movement_id = ?",
      Int::class.java,
      createdId.toString(),
    )
    assertThat(occurrenceRows).isEqualTo(1)
  }

  @Test
  fun `lists transfer recurring movement for destination account`() {
    val recurringMovementRepository = JdbcRecurringMovementRepository(db.namedJdbcTemplate)
    val createRecurringMovementUC = CreateRecurringMovementService(recurringMovementRepository, scheduleCalculator)
    val listRecurringMovementsUC = ListRecurringMovementsByAccountService(recurringMovementRepository)

    val createdId = createRecurringMovementUC.execute(
      CreateRecurringMovementCommand(
        type = RecurringMovementType.TRANSFER,
        sourceAccountId = "acc-main",
        targetAccountId = "acc-savings",
        amount = BigDecimal("120.00"),
        currency = "USD",
        destinationAmount = null,
        destinationCurrency = null,
        exchangeRate = null,
        description = "Auto transfer",
        merchant = "Main -> Savings",
        rule = RecurrenceRule(
          frequency = RecurrenceFrequency.MONTHLY,
          interval = 1,
        ),
        recurrenceEnd = RecurrenceEnd.Never,
        startAt = Instant.parse("2026-04-10T09:00:00Z"),
        zoneId = "UTC",
        createdAt = Instant.parse("2026-04-10T08:00:00Z"),
      ),
    )

    val sourceItems = listRecurringMovementsUC.execute(
      ListRecurringMovementsByAccountQuery(sourceAccountId = "acc-main"),
    )
    val targetItems = listRecurringMovementsUC.execute(
      ListRecurringMovementsByAccountQuery(sourceAccountId = "acc-savings"),
    )

    assertThat(sourceItems).hasSize(1)
    assertThat(targetItems).hasSize(1)
    assertThat(sourceItems.first().id).isEqualTo(createdId.toString())
    assertThat(targetItems.first().id).isEqualTo(createdId.toString())
    assertThat(targetItems.first().type).isEqualTo(RecurringMovementType.TRANSFER.value)
    assertThat(targetItems.first().targetAccountId).isEqualTo("acc-savings")
  }
}
