package com.gonezo.application.services.workflows

import com.gonezo.analytics.domain.AnalyticsExclusionReason
import com.gonezo.analytics.domain.AnalyticsExclusionScopeType
import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.expected.application.ResolveExpectedMovementCommand
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.ledger.application.OpenLedgerAccountCommand
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.domain.AccountType
import com.gonezo.sharing.application.ApplyShareParticipantCommand
import com.gonezo.sharing.application.ApplyShareToPostedMovementCommand
import com.gonezo.sharing.application.GetMovementSharingDetailsQuery
import com.gonezo.sharing.application.SharingPersonReference
import com.gonezo.sharing.domain.ShareSettlementStatus
import com.gonezo.sharing.domain.SharedMovementType
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class SharingWorkflowIT : SqliteE2ETest() {
    @Test
    fun `analytics exclusion repository rejects the exact historical reason before migration`() {
        db.jdbcTemplate.update(
            """
            insert into analytics_exclusions(id, scope_type, scope_id, reason, created_at)
            values ('00000000-0000-4000-8000-000000000001', 'movement', 'movement-1', 'shared_expense_lent_amount', '2026-06-29T10:15:00Z')
            """.trimIndent(),
        )

        assertThatThrownBy { app.analyticsExclusionRepository.listAll() }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Unsupported analytics exclusion reason: shared_expense_lent_amount")
    }

    @Test
    fun `sharing an expense creates reusable person expected repayment and analytics exclusions`() {
        val accountId = openCashAccount()
        val transactionId = recordExpense(accountId.toString(), "20.00", description = "Dinner", merchant = null)

        val result =
            app.sharingApplyShareToPostedMovementUC.execute(
                ApplyShareToPostedMovementCommand(
                    transactionId = transactionId,
                    payer = SharingPersonReference.New("You"),
                    participants =
                    listOf(
                        ApplyShareParticipantCommand(
                            person = SharingPersonReference.New("Tyler"),
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
        assertThat(expectedMovement.description).isEqualTo("Dinner · Tyler")
        assertThat(expectedMovement.merchant).isEqualTo("Tyler")
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

        app.sharingApplyShareToPostedMovementUC.execute(
            ApplyShareToPostedMovementCommand(
                transactionId = firstTransactionId,
                payer = SharingPersonReference.New("You"),
                participants = listOf(ApplyShareParticipantCommand(SharingPersonReference.New("Tyler"), BigDecimal("10.00"), true)),
                appliedAt = Instant.parse("2026-06-29T10:15:00Z"),
            ),
        )
        app.sharingApplyShareToPostedMovementUC.execute(
            ApplyShareToPostedMovementCommand(
                transactionId = secondTransactionId,
                payer = SharingPersonReference.Existing(app.sharingPersonRepository.listActive().single { it.normalizedName == "you" }.id.toString()),
                participants = listOf(ApplyShareParticipantCommand(SharingPersonReference.Existing(app.sharingPersonRepository.listActive().single { it.normalizedName == "tyler" }.id.toString()), BigDecimal("6.00"), true)),
                appliedAt = Instant.parse("2026-06-29T11:15:00Z"),
            ),
        )

        val people = app.sharingPersonRepository.listActive()
        assertThat(people.filter { it.normalizedName == "tyler" }).hasSize(1)
    }

    @Test
    fun `reimbursement titles use merchant precedence and trimmed participant names`() {
        val accountId = openCashAccount()
        val transactionId = recordExpense(accountId.toString(), "30.00", description = "Dinner note", merchant = "Restaurant")

        val result = app.sharingApplyShareToPostedMovementUC.execute(
            ApplyShareToPostedMovementCommand(
                transactionId = transactionId,
                payer = SharingPersonReference.CurrentUser,
                participants = listOf(
                    ApplyShareParticipantCommand(SharingPersonReference.New(" Tyler "), BigDecimal("10.00"), true),
                    ApplyShareParticipantCommand(SharingPersonReference.New(" Laura "), BigDecimal("5.00"), true),
                    ApplyShareParticipantCommand(SharingPersonReference.New(" No settlement "), BigDecimal.ZERO, true),
                ),
                appliedAt = Instant.parse("2026-06-29T10:15:00Z"),
            ),
        )

        val expected = result.participants.filter { it.expectedMovementId != null }
            .map { app.expectedMovementRepository.findById(it.expectedMovementId!!)!! }
        assertThat(expected.map { it.description }).containsExactlyInAnyOrder("Restaurant · Tyler", "Restaurant · Laura")
        assertThat(expected.map { it.merchant }).containsExactlyInAnyOrder("Tyler", "Laura")
        assertThat(result.participants.single { it.displayName == "No settlement" }.expectedMovementId).isNull()
    }

    @Test
    fun `sharing a second expense with the current payer reproduces the duplicate payer failure`() {
        val accountId = openCashAccount()
        val firstTransactionId = recordExpense(accountId.toString(), "20.00")
        val secondTransactionId = recordExpense(accountId.toString(), "12.00")
        val command = { transactionId: String ->
            ApplyShareToPostedMovementCommand(
                transactionId = transactionId,
                payer = SharingPersonReference.New("You"),
                participants = listOf(ApplyShareParticipantCommand(SharingPersonReference.New("Tyler"), BigDecimal("10.00"), true)),
                appliedAt = Instant.parse("2026-06-29T10:15:00Z"),
            )
        }

        app.sharingApplyShareToPostedMovementUC.execute(command(firstTransactionId))

        assertThatThrownBy { app.sharingApplyShareToPostedMovementUC.execute(command(secondTransactionId)) }
            .hasMessage("Sharing person already exists: You")
    }

    @Test
    fun `current payer identity is reused across shared expenses`() {
        val accountId = openCashAccount()
        val firstTransactionId = recordExpense(accountId.toString(), "20.00")
        val secondTransactionId = recordExpense(accountId.toString(), "12.00")
        val command = { transactionId: String, participant: SharingPersonReference ->
            ApplyShareToPostedMovementCommand(
                transactionId = transactionId,
                payer = SharingPersonReference.CurrentUser,
                participants = listOf(ApplyShareParticipantCommand(participant, BigDecimal("10.00"), true)),
                appliedAt = Instant.parse("2026-06-29T10:15:00Z"),
            )
        }

        app.sharingApplyShareToPostedMovementUC.execute(command(firstTransactionId, SharingPersonReference.New("Tyler")))
        val tyler = app.sharingPersonRepository.listActive().single { it.normalizedName == "tyler" }
        app.sharingApplyShareToPostedMovementUC.execute(command(secondTransactionId, SharingPersonReference.Existing(tyler.id.toString())))

        assertThat(app.sharingPersonRepository.listActive().count { it.normalizedName == "you" }).isEqualTo(1)
    }

    @Test
    fun `resolved expected marks shared participant as paid in movement sharing details`() {
        val accountId = openCashAccount()
        val transactionId = recordExpense(accountId.toString(), "20.00")
        val share =
            app.sharingApplyShareToPostedMovementUC.execute(
                ApplyShareToPostedMovementCommand(
                    transactionId = transactionId,
                    payer = SharingPersonReference.New("You"),
                    participants = listOf(ApplyShareParticipantCommand(SharingPersonReference.New("Tyler"), BigDecimal("10.00"), true)),
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
        val share =
            app.sharingApplyShareToPostedMovementUC.execute(
                ApplyShareToPostedMovementCommand(
                    transactionId = transactionId,
                    payer = SharingPersonReference.New("You"),
                    participants = listOf(ApplyShareParticipantCommand(SharingPersonReference.New("Tyler"), BigDecimal("10.00"), true)),
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

    @Test
    fun `sharing an income creates an expected payout and exposes income analytics`() {
        val accountId = openCashAccount()
        val transactionId = recordIncome(accountId.toString(), "120.00")

        app.sharingApplyShareToPostedMovementUC.execute(
            ApplyShareToPostedMovementCommand(
                transactionId = transactionId,
                payer = SharingPersonReference.New("You"),
                participants = listOf(ApplyShareParticipantCommand(SharingPersonReference.New("Tyler"), BigDecimal("60.00"), true)),
                appliedAt = Instant.parse("2026-06-29T10:15:00Z"),
            ),
        )

        val details = app.sharingGetMovementSharingDetailsUC.execute(GetMovementSharingDetailsQuery(transactionId))!!
        assertThat(details.movementType).isEqualTo(SharedMovementType.INCOME)
        assertThat(details.analytics.personalIncomeAmount).isEqualByComparingTo("60.00")
        assertThat(details.analytics.pendingToPayOut).isEqualByComparingTo("60.00")
        assertThat(details.analytics.paidOut).isEqualByComparingTo("0.00")
        val expectedMovement = app.expectedMovementRepository.findById(ExpectedMovementId.from(details.participants.single().expectedMovementId!!))
        assertThat(expectedMovement!!.type.value).isEqualTo("expense")
    }

    @Test
    fun `settled sharing records the participant without creating an expected movement`() {
        val accountId = openCashAccount()
        val transactionId = recordExpense(accountId.toString(), "20.00")

        val result = app.sharingApplyShareToPostedMovementUC.execute(
            ApplyShareToPostedMovementCommand(
                transactionId = transactionId,
                payer = SharingPersonReference.CurrentUser,
                participants = listOf(
                    ApplyShareParticipantCommand(
                        person = SharingPersonReference.New("Tyler"),
                        amount = BigDecimal("10.00"),
                        settlementStatus = ShareSettlementStatus.SETTLED,
                    ),
                ),
                appliedAt = Instant.parse("2026-06-29T10:15:00Z"),
            ),
        )

        assertThat(result.participants.single().expectedMovementId).isNull()
        assertThat(app.sharingGetMovementSharingDetailsUC.execute(GetMovementSharingDetailsQuery(transactionId))!!.participants.single().repaymentStatus)
            .isEqualTo("paid")
    }

    @Test
    fun `zero amount participant remains a guest without an expected movement`() {
        val accountId = openCashAccount()
        val transactionId = recordExpense(accountId.toString(), "20.00")

        val result = app.sharingApplyShareToPostedMovementUC.execute(
            ApplyShareToPostedMovementCommand(
                transactionId = transactionId,
                payer = SharingPersonReference.New("You"),
                participants = listOf(ApplyShareParticipantCommand(SharingPersonReference.New("Tyler"), BigDecimal("0.00"), true)),
                appliedAt = Instant.parse("2026-06-29T10:15:00Z"),
            ),
        )

        assertThat(result.participants.single().expectedMovementId).isNull()
        val details = app.sharingGetMovementSharingDetailsUC.execute(GetMovementSharingDetailsQuery(transactionId))!!
        assertThat(details.participants.single().repaymentStatus).isEqualTo("not_expected")
        assertThat(app.sharingPersonRepository.listActive().map { it.displayName }).contains("Tyler")
    }

    private fun openCashAccount() = app.ledgerOpenAccountUC.execute(
        OpenLedgerAccountCommand(
            name = "Cash",
            type = AccountType.CASH,
            currency = CurrencyCode.from("EUR"),
            createdAt = Instant.parse("2026-06-29T09:00:00Z"),
        ),
    )

    private fun recordExpense(accountId: String, amount: String, description: String = "Cafe", merchant: String? = "Cafe"): String = app.ledgerRecordExpenseUC
        .execute(
            RecordLedgerExpenseCommand(
                accountId =
                com.gonezo.ledger.domain.AccountId
                    .from(accountId),
                amount = Money(BigDecimal(amount), "EUR"),
                occurredAt = Instant.parse("2026-06-29T10:00:00Z"),
                description = description,
                merchant = merchant,
            ),
        ).toString()

    private fun recordIncome(accountId: String, amount: String): String = app.ledgerRecordIncomeUC
        .execute(
            com.gonezo.ledger.application.RecordLedgerIncomeCommand(
                accountId =
                com.gonezo.ledger.domain.AccountId
                    .from(accountId),
                amount = Money(BigDecimal(amount), "EUR"),
                occurredAt = Instant.parse("2026-06-30T10:00:00Z"),
                description = "Tyler reimbursement",
                merchant = "Tyler",
            ),
        ).toString()
}
