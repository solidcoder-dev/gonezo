package com.gonezo.multiplatform.core

import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.recurrence.domain.MonthlyPattern
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementReviewPolicy
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.math.BigDecimal
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID
import org.junit.Assert.assertEquals
import org.junit.Test

class AndroidRecurringExpectedCoordinatorTest {
  private val recurringMovementId = RecurringMovementId.random()
  private val fixedClock = Clock.fixed(Instant.parse("2026-04-01T00:00:00Z"), ZoneOffset.UTC)

  @Test
  fun projectsOnePendingExpectedAndContinuesAfterResolution() {
    val repository = InMemoryRecurringMovementRepository(confirmationRequiredMovement())
    val store = InMemoryStore()
    val coordinator = coordinator(repository, store)

    coordinator.projectNext(recurringMovementId.toString())
    coordinator.projectNext(recurringMovementId.toString())

    assertEquals(listOf("2026-04-11T10:00:00Z"), store.expectedMovements.map { it.dueAt })
    assertEquals("2026-05-11T10:00:00Z", repository.current().nextDueAt.toString())
    assertEquals(1, repository.current().generatedOccurrences)

    val firstExpected = store.expectedMovements.single()
    store.closeExpected(firstExpected.id)
    coordinator.continueAfterResolution(firstExpected.id, "tx-1", "2026-04-11T10:10:00Z")

    assertEquals(listOf("2026-04-11T10:00:00Z", "2026-05-11T10:00:00Z"), store.expectedMovements.map { it.dueAt })
    assertEquals("posted", store.occurrences.getValue(firstExpected.occurrenceId).status)
    assertEquals("tx-1", store.occurrences.getValue(firstExpected.occurrenceId).ledgerTransactionId)
    assertEquals("2026-06-11T10:00:00Z", repository.current().nextDueAt.toString())
  }

  @Test
  fun dismissingAnExpectedOccurrenceStillProjectsTheNextReview() {
    val repository = InMemoryRecurringMovementRepository(confirmationRequiredMovement())
    val store = InMemoryStore()
    val coordinator = coordinator(repository, store)

    coordinator.projectNext(recurringMovementId.toString())
    val firstExpected = store.expectedMovements.single()
    store.closeExpected(firstExpected.id)
    coordinator.continueAfterDismissal(firstExpected.id, "2026-04-11T10:10:00Z")

    assertEquals("failed", store.occurrences.getValue(firstExpected.occurrenceId).status)
    assertEquals("USER_DISMISSED", store.occurrences.getValue(firstExpected.occurrenceId).errorCode)
    assertEquals(listOf("2026-04-11T10:00:00Z", "2026-05-11T10:00:00Z"), store.expectedMovements.map { it.dueAt })
  }

  private fun coordinator(
    repository: InMemoryRecurringMovementRepository,
    store: InMemoryStore,
  ) = AndroidRecurringExpectedCoordinator(
    recurringMovementRepository = repository,
    store = store,
    clock = fixedClock,
    consistencyBoundary = ImmediateConsistencyBoundary,
  )

  private fun confirmationRequiredMovement(): RecurringMovement = RecurringMovement.create(
    id = recurringMovementId,
    type = com.gonezo.recurrence.domain.RecurringMovementType.EXPENSE,
    sourceAccountId = "acc-1",
    targetAccountId = null,
    amount = BigDecimal("15.00"),
    currency = "USD",
    destinationAmount = null,
    destinationCurrency = null,
    exchangeRate = null,
    description = "Rent",
    merchant = "Landlord",
    categoryId = "cat-rent",
    reviewPolicy = RecurringMovementReviewPolicy.REQUIRE_USER_CONFIRMATION,
    rule = RecurrenceRule(
      frequency = RecurrenceFrequency.MONTHLY,
      interval = 1,
      weeklyDays = emptySet(),
      monthlyPattern = MonthlyPattern.DAY_OF_MONTH,
      dayOfMonth = 11,
      monthlyWeekOrdinal = null,
      monthlyWeekday = null,
    ),
    recurrenceEnd = RecurrenceEnd.Never,
    startAt = Instant.parse("2026-04-02T10:00:00Z"),
    zoneId = "UTC",
    createdAt = Instant.parse("2026-04-01T00:00:00Z"),
    scheduleCalculator = RecurrenceScheduleCalculator(),
  )

  private class InMemoryRecurringMovementRepository(
    initialMovement: RecurringMovement,
  ) : RecurringMovementRepository {
    private var movement = initialMovement

    fun current(): RecurringMovement = movement

    override fun save(movement: RecurringMovement) {
      this.movement = movement
    }

    override fun findById(id: RecurringMovementId): RecurringMovement? =
      movement.takeIf { it.id == id }

    override fun findDue(now: Instant, limit: Int): List<RecurringMovement> = emptyList()

    override fun listBySourceAccount(accountId: String): List<RecurringMovement> = listOf(movement)
  }

  private class InMemoryStore : AndroidRecurringExpectedCoordinator.Store {
    data class Occurrence(
      val id: String,
      val recurringMovementId: String,
      val dueAt: String,
      var status: String,
      var ledgerTransactionId: String? = null,
      var errorCode: String? = null,
    )

    data class ExpectedMovement(
      val id: String,
      val occurrenceId: String,
      val recurringMovementId: String,
      val dueAt: String,
      var pending: Boolean = true,
    )

    val occurrences = linkedMapOf<String, Occurrence>()
    val expectedMovements = mutableListOf<ExpectedMovement>()

    fun closeExpected(expectedMovementId: String) {
      expectedMovements.first { it.id == expectedMovementId }.pending = false
    }

    override fun findPendingExpectedMovementId(recurringMovementId: String): String? =
      expectedMovements.firstOrNull { it.recurringMovementId == recurringMovementId && it.pending }?.id

    override fun findOccurrenceId(recurringMovementId: String, dueAt: String): String? =
      occurrences.values.firstOrNull {
        it.recurringMovementId == recurringMovementId && it.dueAt == dueAt
      }?.id

    override fun createPendingOccurrence(recurringMovementId: String, dueAt: String, createdAt: String): String =
      UUID.randomUUID().toString().also { occurrenceId ->
        occurrences[occurrenceId] = Occurrence(occurrenceId, recurringMovementId, dueAt, "pending")
      }

    override fun findExpectedMovementId(originOccurrenceId: String): String? =
      expectedMovements.firstOrNull { it.occurrenceId == originOccurrenceId }?.id

    override fun createExpectedMovement(movement: RecurringMovement, originOccurrenceId: String, dueAt: String): String =
      UUID.randomUUID().toString().also { expectedMovementId ->
        expectedMovements += ExpectedMovement(
          expectedMovementId,
          originOccurrenceId,
          movement.id.toString(),
          dueAt,
        )
      }

    override fun findExpectedOrigin(expectedMovementId: String): AndroidRecurringExpectedCoordinator.ExpectedOrigin? =
      expectedMovements.firstOrNull { it.id == expectedMovementId }?.let {
        AndroidRecurringExpectedCoordinator.ExpectedOrigin(it.occurrenceId, it.recurringMovementId)
      }

    override fun acknowledgeOccurrence(
      occurrenceId: String,
      status: String,
      ledgerTransactionId: String?,
      errorCode: String?,
      errorMessage: String?,
      acknowledgedAt: String,
    ) {
      occurrences.getValue(occurrenceId).apply {
        this.status = status
        this.ledgerTransactionId = ledgerTransactionId
        this.errorCode = errorCode
      }
    }
  }
}
