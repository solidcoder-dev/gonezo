package com.gonezo.application.services.workflows

import com.gonezo.analytics.application.AnalyticsExclusionReason
import com.gonezo.analytics.application.AnalyticsExclusionScopeType
import com.gonezo.domain.shared.Money
import com.gonezo.expected.application.ResolveExpectedMovementCommand
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.ledger.application.OpenLedgerAccountCommand
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.sharing.application.ApplyShareParticipantCommand
import com.gonezo.sharing.application.ApplyShareToPostedTransactionCommand
import com.gonezo.sharing.application.GetMovementSharingDetailsQuery
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class SharingWorkflowIT : SqliteE2ETest() {
  @Test
  fun `sharing an expense creates reusable person expected repayment and analytics exclusions`() {
    val accountId = openCashAccount()
    val transactionId = recordExpense(accountId.toString(), "20.00")

    val result = app.sharingApplyShareToPostedTransactionUC.execute(
      ApplyShareToPostedTransactionCommand(
        transactionId = transactionId,
        payerName = "You",
        participants = listOf(
          ApplyShareParticipantCommand(
            personName = "Tyler",
            amount = BigDecimal("10.00"),
            reimbursable = true,
          ),
        ),
        appliedAt = Instant.parse("2026-06-29T10:15:00Z"),
      ),
    )

    val people = app.sharingPersonRepository.listActive()
    assertThat(people.map { it.displayName }).containsExactlyInAnyOrder("You", "Tyler")

    val expectedMovement = app.expectedMovementRepository.findById(result.participants.single().expectedMovementId!!)
    assertThat(expectedMovement!!.type.value).isEqualTo("income")
    assertThat(expectedMovement.amount).isEqualByComparingTo("10.00")
    assertThat(expectedMovement.status).isEqualTo(ExpectedMovementStatus.PENDING)

    val exclusions = app.analyticsExclusionRepository.listAll()
    assertThat(exclusions.map { it.scopeType }).containsExactlyInAnyOrder(
      AnalyticsExclusionScopeType.SHARE_PARTICIPANT,
      AnalyticsExclusionScopeType.EXPECTED_MOVEMENT,
    )
    assertThat(exclusions.map { it.reason }).containsExactlyInAnyOrder(
      AnalyticsExclusionReason.SHARED_EXPENSE,
      AnalyticsExclusionReason.REIMBURSEMENT,
    )
  }

  @Test
  fun `sharing with existing person reuses the person`() {
    val accountId = openCashAccount()
    val firstTransactionId = recordExpense(accountId.toString(), "20.00")
    val secondTransactionId = recordExpense(accountId.toString(), "12.00")

    app.sharingApplyShareToPostedTransactionUC.execute(
      ApplyShareToPostedTransactionCommand(
        transactionId = firstTransactionId,
        payerName = "You",
        participants = listOf(ApplyShareParticipantCommand("Tyler", BigDecimal("10.00"), true)),
        appliedAt = Instant.parse("2026-06-29T10:15:00Z"),
      ),
    )
    app.sharingApplyShareToPostedTransactionUC.execute(
      ApplyShareToPostedTransactionCommand(
        transactionId = secondTransactionId,
        payerName = "You",
        participants = listOf(ApplyShareParticipantCommand(" tyler ", BigDecimal("6.00"), true)),
        appliedAt = Instant.parse("2026-06-29T11:15:00Z"),
      ),
    )

    val people = app.sharingPersonRepository.listActive()
    assertThat(people.filter { it.normalizedName == "tyler" }).hasSize(1)
  }

  @Test
  fun `resolved expected marks shared participant as paid in movement sharing details`() {
    val accountId = openCashAccount()
    val transactionId = recordExpense(accountId.toString(), "20.00")
    val share = app.sharingApplyShareToPostedTransactionUC.execute(
      ApplyShareToPostedTransactionCommand(
        transactionId = transactionId,
        payerName = "You",
        participants = listOf(ApplyShareParticipantCommand("Tyler", BigDecimal("10.00"), true)),
        appliedAt = Instant.parse("2026-06-29T10:15:00Z"),
      ),
    )
    val expectedMovementId = share.participants.single().expectedMovementId!!

    app.expectedResolveMovementUC.execute(
      ResolveExpectedMovementCommand(
        expectedMovementId = expectedMovementId,
        transactionId = recordIncome(accountId.toString(), "10.00"),
        resolvedAt = Instant.parse("2026-06-30T10:15:00Z"),
      ),
    )

    val details = app.sharingGetMovementSharingDetailsUC.execute(GetMovementSharingDetailsQuery(transactionId))

    assertThat(details!!.participants.single { it.displayName == "Tyler" }.repaymentStatus).isEqualTo("paid")
  }

  @Test
  fun `shared movement analytics treats lent amount and reimbursement income as excluded`() {
    val accountId = openCashAccount()
    val transactionId = recordExpense(accountId.toString(), "20.00")
    val share = app.sharingApplyShareToPostedTransactionUC.execute(
      ApplyShareToPostedTransactionCommand(
        transactionId = transactionId,
        payerName = "You",
        participants = listOf(ApplyShareParticipantCommand("Tyler", BigDecimal("10.00"), true)),
        appliedAt = Instant.parse("2026-06-29T10:15:00Z"),
      ),
    )
    app.expectedResolveMovementUC.execute(
      ResolveExpectedMovementCommand(
        expectedMovementId = share.participants.single().expectedMovementId!!,
        transactionId = recordIncome(accountId.toString(), "10.00"),
        resolvedAt = Instant.parse("2026-06-30T10:15:00Z"),
      ),
    )

    val adjustment = app.sharingGetMovementSharingDetailsUC.execute(GetMovementSharingDetailsQuery(transactionId))!!.analytics

    assertThat(adjustment.personalExpenseAmount).isEqualByComparingTo("10.00")
    assertThat(adjustment.excludedLentAmount).isEqualByComparingTo("10.00")
    assertThat(adjustment.excludedReimbursementIncomeAmount).isEqualByComparingTo("10.00")
  }

  private fun openCashAccount() = app.ledgerOpenAccountUC.execute(
    OpenLedgerAccountCommand(
      name = "Cash",
      type = AccountType.CASH,
      currency = CurrencyCode.from("EUR"),
      createdAt = Instant.parse("2026-06-29T09:00:00Z"),
    ),
  )

  private fun recordExpense(accountId: String, amount: String): String = app.ledgerRecordExpenseUC.execute(
    RecordLedgerExpenseCommand(
      accountId = com.gonezo.ledger.domain.AccountId.from(accountId),
      amount = Money(BigDecimal(amount), "EUR"),
      occurredAt = Instant.parse("2026-06-29T10:00:00Z"),
      description = "Cafe",
      merchant = "Cafe",
    ),
  ).toString()

  private fun recordIncome(accountId: String, amount: String): String = app.ledgerRecordIncomeUC.execute(
    com.gonezo.ledger.application.RecordLedgerIncomeCommand(
      accountId = com.gonezo.ledger.domain.AccountId.from(accountId),
      amount = Money(BigDecimal(amount), "EUR"),
      occurredAt = Instant.parse("2026-06-30T10:00:00Z"),
      description = "Tyler reimbursement",
      merchant = "Tyler",
    ),
  ).toString()
}
