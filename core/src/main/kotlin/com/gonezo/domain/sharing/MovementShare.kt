package com.gonezo.sharing.domain

import java.math.BigDecimal
import java.time.Instant

data class MovementShare(
    val id: MovementShareId,
    val sourceTransactionId: String,
    val payerPersonId: SharingPersonId,
    val totalAmount: BigDecimal,
    val currency: String,
    val participants: List<ShareParticipant>,
    val createdAt: Instant,
    val updatedAt: Instant,
    val movementType: SharedMovementType = SharedMovementType.EXPENSE,
    val allocationMode: ShareAllocationMode = ShareAllocationMode.AMOUNTS,
    val ownerAllocation: BigDecimal = totalAmount - participants.fold(BigDecimal.ZERO) { acc, participant -> acc + participant.amount },
) {
    init {
        require(sourceTransactionId.isNotBlank()) { "source transaction id is required" }
        require(totalAmount > BigDecimal.ZERO) { "movement share total amount must be greater than 0" }
        require(currency.matches(Regex("^[A-Z]{3}$"))) { "movement share currency must be 3 uppercase letters" }
        require(participants.isNotEmpty()) { "expense share requires participants" }
        require(participants.map { it.personId }.toSet().size == participants.size) { "movement share cannot duplicate participants" }
        require(participants.none { it.personId == payerPersonId }) { "movement share owner cannot be a participant" }
        require(ownerAllocation >= BigDecimal.ZERO) { "owner allocation must not be negative" }
        require((ownerAllocation + participants.fold(BigDecimal.ZERO) { acc, participant -> acc + participant.amount }).compareTo(totalAmount) == 0) {
            "movement share allocations must equal source movement amount"
        }
    }
}
