package com.gonezo.multiplatform.core

import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.concurrent.ConcurrentHashMap

class AndroidRecurringCoreTest {
  @Test
  fun createListAndDeactivateRoundTrip() {
    val repository = InMemoryRecurringMovementRepository()
    val accountExists: (String) -> Boolean = { accountId -> accountId == "acc-1" || accountId == "acc-2" }
    val fixedClock = Clock.fixed(Instant.parse("2026-04-01T00:00:00Z"), ZoneOffset.UTC)

    val coreA = AndroidRecurringCore(
      recurringMovementRepository = repository,
      accountExists = accountExists,
      clock = fixedClock,
    )

    val createdId = coreA.createRecurringMovement(
      AndroidRecurringCore.CreateRecurringMovementInput(
        type = "expense",
        sourceAccountId = "acc-1",
        targetAccountId = null,
        amount = "15.00",
        currency = "USD",
        destinationAmount = null,
        destinationCurrency = null,
        exchangeRate = null,
        description = "Rent",
        merchant = "Landlord",
        rule = AndroidRecurringCore.RecurrenceRuleInput(
          frequency = "monthly",
          interval = 1,
          weeklyDays = emptyList(),
          monthlyPattern = "day_of_month",
          dayOfMonth = 11,
          monthlyWeekOrdinal = null,
          monthlyWeekday = null,
        ),
        recurrenceEnd = AndroidRecurringCore.RecurrenceEndInput(
          kind = "never",
          onDate = null,
          afterOccurrences = null,
        ),
        startAt = "2026-04-02T10:00:00Z",
        zoneId = "UTC",
      ),
    )

    val coreB = AndroidRecurringCore(
      recurringMovementRepository = repository,
      accountExists = accountExists,
      clock = fixedClock,
    )

    val listed = coreB.listRecurringMovements("acc-1")
    assertEquals(1, listed.size)
    assertEquals(createdId.toString(), listed.first().id)
    assertEquals("monthly", listed.first().rule.frequency)
    assertEquals(11, listed.first().rule.dayOfMonth)
    assertEquals("never", listed.first().recurrenceEnd.kind)

    coreB.deactivateRecurringMovement(createdId.toString(), "2026-04-02T11:00:00Z")

    val afterDeactivate = coreB.listRecurringMovements("acc-1")
    assertEquals(1, afterDeactivate.size)
    assertEquals("deactivated", afterDeactivate.first().status)
    assertNull(afterDeactivate.first().nextDueAt)
  }

  private class InMemoryRecurringMovementRepository : RecurringMovementRepository {
    private val storage = ConcurrentHashMap<RecurringMovementId, RecurringMovement>()

    override fun save(movement: RecurringMovement) {
      storage[movement.id] = movement
    }

    override fun findById(id: RecurringMovementId): RecurringMovement? = storage[id]

    override fun findDue(now: Instant, limit: Int): List<RecurringMovement> = storage.values
      .asSequence()
      .filter { it.status == RecurringMovementStatus.ACTIVE && it.nextDueAt != null && !it.nextDueAt!!.isAfter(now) }
      .sortedWith(compareBy<RecurringMovement> { it.nextDueAt }.thenBy { it.id.toString() })
      .take(limit)
      .toList()

    override fun listBySourceAccount(accountId: String): List<RecurringMovement> = storage.values
      .filter { it.sourceAccountId == accountId }
  }
}

