package com.gonezo.sharing.domain

import java.math.BigDecimal

data class ShareParticipant(
    val id: ShareParticipantId,
    val personId: SharingPersonId,
    val amount: BigDecimal,
    val settlementStatus: ShareSettlementStatus,
    val expectedMovementId: String?,
    val settlementTransactionId: String? = null,
) {
    val requiresSettlement: Boolean
        get() = settlementStatus != ShareSettlementStatus.NOT_REQUIRED

    init {
        require(amount >= BigDecimal.ZERO) { "share participant amount must not be negative" }
        if (amount == BigDecimal.ZERO) {
            require(settlementStatus == ShareSettlementStatus.NOT_REQUIRED) { "zero amount participant cannot require settlement" }
        }
        when (settlementStatus) {
            ShareSettlementStatus.NOT_REQUIRED -> require(expectedMovementId == null && settlementTransactionId == null) {
                "non-settled participant cannot reference settlement movements"
            }
            ShareSettlementStatus.PENDING -> require(expectedMovementId != null) { "pending participant requires expected movement" }
            ShareSettlementStatus.SETTLED -> require(settlementTransactionId != null) { "settled participant requires settlement transaction" }
        }
    }

    @Deprecated("Use settlementStatus")
    val reimbursable: Boolean
        get() = settlementStatus != ShareSettlementStatus.NOT_REQUIRED

    constructor(id: ShareParticipantId, personId: SharingPersonId, amount: BigDecimal, reimbursable: Boolean, expectedMovementId: String?) : this(
        id = id,
        personId = personId,
        amount = amount,
        settlementStatus = if (reimbursable) ShareSettlementStatus.PENDING else ShareSettlementStatus.NOT_REQUIRED,
        expectedMovementId = expectedMovementId,
    )
}
