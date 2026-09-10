package com.gonezo.application.services.sharing

import com.gonezo.sharing.domain.ShareAllocationMode
import com.gonezo.sharing.domain.ShareParticipant
import com.gonezo.sharing.domain.ShareParticipantId
import com.gonezo.sharing.domain.ShareSettlementStatus
import com.gonezo.sharing.domain.SharedMovementType
import com.gonezo.sharing.domain.MovementShare
import com.gonezo.sharing.domain.MovementShareId
import com.gonezo.sharing.domain.SharingPerson
import com.gonezo.sharing.domain.SharingPersonId
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant
import java.math.BigDecimal

class SharingSemanticsDomainTest {
    @Test
    fun `sharing semantics expose the closed vocabulary`() {
        assertThat(SharedMovementType.values()).containsExactly(SharedMovementType.EXPENSE, SharedMovementType.INCOME)
        assertThat(ShareAllocationMode.values()).containsExactly(
            ShareAllocationMode.EQUAL,
            ShareAllocationMode.PARTS,
            ShareAllocationMode.AMOUNTS,
        )
        assertThat(ShareSettlementStatus.values()).containsExactly(
            ShareSettlementStatus.NOT_REQUIRED,
            ShareSettlementStatus.PENDING,
            ShareSettlementStatus.SETTLED,
        )
    }

    @Test
    fun `renaming preserves the stable person identity and updates normalized presentation data`() {
        val person = SharingPerson.create(
            id = SharingPersonId.random(),
            displayName = "Taylor Smith",
            createdAt = Instant.parse("2026-06-29T10:15:00Z"),
        )

        val renamed = person.rename("  Taylor Jones  ")

        assertThat(renamed.id).isEqualTo(person.id)
        assertThat(renamed.displayName).isEqualTo("Taylor Jones")
        assertThat(renamed.normalizedName).isEqualTo("taylor jones")
    }

    @Test
    fun `renaming rejects a blank display name`() {
        val person = SharingPerson.create(SharingPersonId.random(), "Taylor", Instant.parse("2026-06-29T10:15:00Z"))

        assertThatThrownBy { person.rename("  ") }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("sharing person display name is required")
    }

    @Test
    fun `zero amount participants remain registered and do not require settlement`() {
        val participant = ShareParticipant(
            id = ShareParticipantId.random(),
            personId = SharingPersonId.random(),
            amount = BigDecimal.ZERO,
            settlementStatus = ShareSettlementStatus.NOT_REQUIRED,
            expectedMovementId = null,
        )

        assertThat(participant.amount).isEqualByComparingTo(BigDecimal.ZERO)
        assertThat(participant.settlementStatus).isEqualTo(ShareSettlementStatus.NOT_REQUIRED)
    }

    @Test
    fun `settlement references match their status`() {
        val participantId = ShareParticipantId.random()
        val personId = SharingPersonId.random()

        assertThatThrownBy {
            ShareParticipant(participantId, personId, BigDecimal("2.00"), ShareSettlementStatus.PENDING, null)
        }.isInstanceOf(IllegalArgumentException::class.java)

        assertThatThrownBy {
            ShareParticipant(participantId, personId, BigDecimal("2.00"), ShareSettlementStatus.SETTLED, null, null)
        }.isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `movement share requires exact owner and participant allocation`() {
        val owner = SharingPersonId.random()
        val participant = ShareParticipant(
            ShareParticipantId.random(),
            SharingPersonId.random(),
            BigDecimal("3.33"),
            ShareSettlementStatus.PENDING,
            "expected-1",
        )

        val share = MovementShare(
            id = MovementShareId.random(),
            sourceTransactionId = "movement-1",
            payerPersonId = owner,
            totalAmount = BigDecimal("10.00"),
            currency = "EUR",
            participants = listOf(participant),
            createdAt = Instant.EPOCH,
            updatedAt = Instant.EPOCH,
            movementType = SharedMovementType.INCOME,
            allocationMode = ShareAllocationMode.EQUAL,
            ownerAllocation = BigDecimal("6.67"),
        )

        assertThat(share.ownerAllocation + share.participants.single().amount).isEqualByComparingTo("10.00")
    }
}
