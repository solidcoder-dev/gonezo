package com.gonezo.sharing.domain

import java.math.BigDecimal

data class ShareParticipant(
  val id: ShareParticipantId,
  val personId: SharingPersonId,
  val amount: BigDecimal,
  val reimbursable: Boolean,
  val expectedMovementId: String?,
) {
  init {
    require(amount > BigDecimal.ZERO) { "share participant amount must be greater than 0" }
    require(reimbursable || expectedMovementId == null) { "non reimbursable participant cannot have expected movement" }
  }
}
