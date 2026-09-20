package com.gonezo.application.services.sharing

import com.gonezo.sharing.domain.ExpectedMovementRef
import com.gonezo.sharing.domain.MovementShare
import com.gonezo.sharing.domain.MovementShareId
import com.gonezo.sharing.domain.PlannedMovementShare
import com.gonezo.sharing.domain.PlannedMovementShareId
import com.gonezo.sharing.domain.PlannedMovementShareParticipant
import com.gonezo.sharing.domain.PlannedMovementShareParticipantId
import com.gonezo.sharing.domain.PlannedMovementShareStatus
import com.gonezo.sharing.domain.RecurringMovementRef
import com.gonezo.sharing.domain.RecurringShareAllocationMode
import com.gonezo.sharing.domain.RecurringShareParticipantTemplate
import com.gonezo.sharing.domain.RecurringShareParticipantTemplateId
import com.gonezo.sharing.domain.RecurringSharePlan
import com.gonezo.sharing.domain.RecurringSharePlanId
import com.gonezo.sharing.domain.ShareAllocationMode
import com.gonezo.sharing.domain.ShareParticipant
import com.gonezo.sharing.domain.ShareParticipantId
import com.gonezo.sharing.domain.ShareSettlementStatus
import com.gonezo.sharing.domain.SharedMovementType
import com.gonezo.sharing.domain.SharingPersonId
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class SharingAnalyticsAttributionTest {
    private val resolver = SharingAnalyticsAttributionResolver()

    @Test
    fun `posted expense and income retain all external allocations and exclude pending or settled settlement`() {
        listOf(SharedMovementType.EXPENSE, SharedMovementType.INCOME).forEach { movementType ->
            val pending = participant("30", ShareSettlementStatus.PENDING, "expected-1")
            val notRequired = participant("20", ShareSettlementStatus.NOT_REQUIRED)
            val share = postedShare(movementType, listOf(pending, notRequired))

            val attribution = resolver.posted(share)

            assertThat(attribution.participantCount).isEqualTo(2)
            assertThat(attribution.settlementParticipantCount).isEqualTo(1)
            assertThat(attribution.participantAllocatedAmount).isEqualByComparingTo("50")
            assertThat(attribution.settlementRequiredAmount).isEqualByComparingTo("30")
            assertThat(attribution.personalAmount(BigDecimal("100"))).isEqualByComparingTo("70")

            val settled = resolver.posted(postedShare(movementType, listOf(participant("30", ShareSettlementStatus.SETTLED, settlementTransactionId = "settlement-1"), notRequired)))
            assertThat(settled.personalAmount(BigDecimal("100"))).isEqualByComparingTo("70")
        }
    }

    @Test
    fun `planned attribution uses persisted participant allocation and settlement snapshot`() {
        val planned = PlannedMovementShare(
            PlannedMovementShareId.random(), ExpectedMovementRef("expected-1"), RecurringSharePlanId.random(),
            SharingPersonId.random(), RecurringShareAllocationMode.AMOUNTS, null, BigDecimal("100"), "EUR",
            listOf(PlannedMovementShareParticipant(PlannedMovementShareParticipantId.random(), SharingPersonId.random(), null, BigDecimal("30"), true, 0)),
            PlannedMovementShareStatus.PENDING, null, null, Instant.EPOCH, Instant.EPOCH, ownerIncluded = false,
        )

        val attribution = resolver.expected(planned)

        assertThat(attribution.participantAllocatedAmount).isEqualByComparingTo("30")
        assertThat(attribution.personalAmount(BigDecimal("100"))).isEqualByComparingTo("70")
    }

    @Test
    fun `scheduled parts and fixed amount plans use canonical allocation strategies`() {
        val parts = plan(RecurringShareAllocationMode.PARTS, payerParts = 1, parts = 1, ownerIncluded = false)
        val fixed = plan(RecurringShareAllocationMode.AMOUNTS, amount = "2.35")

        val partsAttribution = resolver.scheduled(parts, BigDecimal("10.00"))
        val fixedAttribution = resolver.scheduled(fixed, BigDecimal("10.00"))

        assertThat(partsAttribution.participantAllocatedAmount).isEqualByComparingTo("10.00")
        assertThat(partsAttribution.settlementRequiredAmount).isEqualByComparingTo("10.00")
        assertThat(fixedAttribution.participantAllocatedAmount).isEqualByComparingTo("2.35")
        assertThat(fixedAttribution.settlementRequiredAmount).isEqualByComparingTo("2.35")
    }

    private fun postedShare(type: SharedMovementType, participants: List<ShareParticipant>) = MovementShare(
        MovementShareId.random(), "transaction-1", SharingPersonId.random(), BigDecimal("100"), "EUR", participants,
        Instant.EPOCH, Instant.EPOCH, type, ShareAllocationMode.AMOUNTS,
        BigDecimal("100") - participants.fold(BigDecimal.ZERO) { total, item -> total + item.amount },
    )

    private fun participant(amount: String, status: ShareSettlementStatus, expectedId: String? = null, settlementTransactionId: String? = null) = ShareParticipant(
        ShareParticipantId.random(),
        SharingPersonId.random(),
        BigDecimal(amount),
        status,
        expectedId,
        settlementTransactionId,
    )

    private fun plan(mode: RecurringShareAllocationMode, payerParts: Int? = null, parts: Int? = null, amount: String? = null, ownerIncluded: Boolean = true) = RecurringSharePlan(
        RecurringSharePlanId.random(), RecurringMovementRef("recurring-1"), SharingPersonId.random(), mode, "EUR", payerParts,
        listOf(RecurringShareParticipantTemplate(RecurringShareParticipantTemplateId.random(), SharingPersonId.random(), parts, amount?.let(::BigDecimal), true, 0)),
        Instant.EPOCH, Instant.EPOCH, ownerIncluded,
    )
}
