package com.gonezo.recurrence.domain

import java.math.BigDecimal
import java.time.Instant

data class RecurringMovement(
  val id: RecurringMovementId,
  val type: RecurringMovementType,
  val sourceAccountId: String,
  val targetAccountId: String?,
  val amount: BigDecimal,
  val currency: String,
  val destinationAmount: BigDecimal?,
  val destinationCurrency: String?,
  val exchangeRate: BigDecimal?,
  val description: String?,
  val merchant: String?,
  val rule: RecurrenceRule,
  val recurrenceEnd: RecurrenceEnd,
  val startAt: Instant,
  val zoneId: String,
  val nextDueAt: Instant?,
  val status: RecurringMovementStatus,
  val generatedOccurrences: Int,
  val createdAt: Instant,
  val updatedAt: Instant,
  val deactivatedAt: Instant?,
  val completedAt: Instant?,
) {
  init {
    require(sourceAccountId.isNotBlank()) { "sourceAccountId is required" }
    require(amount > BigDecimal.ZERO) { "amount must be greater than 0" }
    require(currency.isNotBlank()) { "currency is required" }
    require(zoneId.isNotBlank()) { "zoneId is required" }
    require(generatedOccurrences >= 0) { "generatedOccurrences must be greater or equal to 0" }
  }
}
