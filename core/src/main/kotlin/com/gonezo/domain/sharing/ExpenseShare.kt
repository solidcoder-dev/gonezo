package com.gonezo.sharing.domain

import java.math.BigDecimal
import java.time.Instant

data class ExpenseShare(
  val id: ExpenseShareId,
  val sourceTransactionId: String,
  val payerPersonId: SharingPersonId,
  val totalAmount: BigDecimal,
  val currency: String,
  val participants: List<ShareParticipant>,
  val createdAt: Instant,
  val updatedAt: Instant,
) {
  init {
    require(sourceTransactionId.isNotBlank()) { "source transaction id is required" }
    require(totalAmount > BigDecimal.ZERO) { "expense share total amount must be greater than 0" }
    require(currency.matches(Regex("^[A-Z]{3}$"))) { "expense share currency must be 3 uppercase letters" }
    require(participants.isNotEmpty()) { "expense share requires participants" }
    require(participants.map { it.personId }.toSet().size == participants.size) { "expense share cannot duplicate participants" }
    require(participants.fold(BigDecimal.ZERO) { acc, participant -> acc + participant.amount } <= totalAmount) {
      "share participant amounts cannot exceed source transaction amount"
    }
  }
}
