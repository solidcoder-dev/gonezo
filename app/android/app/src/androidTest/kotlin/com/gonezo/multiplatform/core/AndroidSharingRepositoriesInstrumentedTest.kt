package com.gonezo.multiplatform.core

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.gonezo.sharing.domain.*
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import java.math.BigDecimal
import java.time.Instant

@RunWith(AndroidJUnit4::class)
class AndroidSharingRepositoriesInstrumentedTest {
  @Test
  fun movementAndRecurringSharingRepositoriesRoundTripCanonicalState() {
    val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    val database = CoreDatabase(context, "sharing-roundtrip-${System.nanoTime()}.db")
    val sqlite = database.writableDatabase
    val timestamp = Instant.parse("2026-09-20T10:00:00Z")
    val transactionId = "transaction-${System.nanoTime()}"
    val accountId = "account-${System.nanoTime()}"
    val payer = SharingPerson.create(SharingPersonId.random(), "Payer", timestamp)
    val pendingPerson = SharingPerson.create(SharingPersonId.random(), "Pending", timestamp)
    val settledPerson = SharingPerson.create(SharingPersonId.random(), "Settled", timestamp)
    val zeroPerson = SharingPerson.create(SharingPersonId.random(), "Zero", timestamp)
    val people = AndroidSharingPersonRepository(database)
    listOf(payer, pendingPerson, settledPerson, zeroPerson).forEach(people::save)
    sqlite.execSQL("insert into ledger_accounts(id, name, type, currency, status, created_at) values (?, 'Account', 'asset', 'EUR', 'active', ?)", arrayOf(accountId, timestamp.toString()))
    sqlite.execSQL("insert into ledger_transactions(id, account_id, type, amount, currency, occurred_at, status) values (?, ?, 'income', '100.00', 'EUR', ?, 'posted')", arrayOf(transactionId, accountId, timestamp.toString()))
    val expectedId = "expected-${System.nanoTime()}"
    sqlite.execSQL("insert into expected_movements(id, account_id, movement_type, amount, currency, expected_at, status, created_at, updated_at) values (?, ?, 'expense', '20.00', 'EUR', ?, 'pending', ?, ?)", arrayOf(expectedId, accountId, timestamp.toString(), timestamp.toString(), timestamp.toString()))

    val movementShare = MovementShare(
      MovementShareId.random(), transactionId, payer.id, BigDecimal("100.00"), "EUR",
      listOf(
        ShareParticipant(ShareParticipantId.random(), pendingPerson.id, BigDecimal("20.00"), ShareSettlementStatus.PENDING, expectedId),
        ShareParticipant(ShareParticipantId.random(), settledPerson.id, BigDecimal("30.00"), ShareSettlementStatus.SETTLED, null, "settlement-transaction"),
        ShareParticipant(ShareParticipantId.random(), zeroPerson.id, BigDecimal("0.00"), ShareSettlementStatus.NOT_REQUIRED, null),
      ), timestamp, timestamp, SharedMovementType.INCOME, ShareAllocationMode.EQUAL, BigDecimal("50.00"),
    )
    val movementRepository = AndroidMovementShareRepository(database)
    movementRepository.save(movementShare)
    assertEquals(movementShare, movementRepository.findBySourceTransactionId(transactionId))

    val plan = RecurringSharePlan(
      RecurringSharePlanId.random(), RecurringMovementRef("recurring-${System.nanoTime()}"), payer.id,
      RecurringShareAllocationMode.AMOUNTS, "EUR", null,
      listOf(RecurringShareParticipantTemplate(RecurringShareParticipantTemplateId.random(), pendingPerson.id, null, BigDecimal("2.50"), true, 0)),
      timestamp, timestamp, ownerIncluded = false,
    )
    val planRepository = AndroidRecurringSharePlanRepository(database)
    planRepository.save(plan)
    assertEquals(plan, planRepository.findById(plan.id))

    val plannedShare = PlannedMovementShare(
      PlannedMovementShareId.random(), ExpectedMovementRef("expected-snapshot"), plan.id, payer.id,
      RecurringShareAllocationMode.AMOUNTS, null, BigDecimal("10.00"), "EUR",
      listOf(PlannedMovementShareParticipant(PlannedMovementShareParticipantId.random(), pendingPerson.id, null, BigDecimal("2.50"), true, 0)),
      PlannedMovementShareStatus.MATERIALIZED, transactionId, movementShare.id, timestamp, timestamp, ownerIncluded = false,
    )
    val plannedRepository = AndroidPlannedMovementShareRepository(database)
    plannedRepository.save(plannedShare)
    assertEquals(plannedShare, plannedRepository.findByExpectedMovementRef(plannedShare.expectedMovementRef))
    database.close()
  }
}
