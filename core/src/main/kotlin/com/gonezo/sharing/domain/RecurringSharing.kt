package com.gonezo.sharing.domain

import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Instant
import java.util.UUID

@JvmInline value class RecurringMovementRef(val value: String) {
  init { require(value.isNotBlank()) { "recurring movement reference is required" } }
  override fun toString(): String = value
}

@JvmInline value class ExpectedMovementRef(val value: String) {
  init { require(value.isNotBlank()) { "expected movement reference is required" } }
  override fun toString(): String = value
}

@JvmInline value class RecurringSharePlanId(val value: UUID) {
  override fun toString(): String = value.toString()
  companion object { fun random() = RecurringSharePlanId(UUID.randomUUID()) }
}

@JvmInline value class RecurringShareParticipantTemplateId(val value: UUID) {
  override fun toString(): String = value.toString()
  companion object { fun random() = RecurringShareParticipantTemplateId(UUID.randomUUID()) }
}

@JvmInline value class PlannedExpenseShareId(val value: UUID) {
  override fun toString(): String = value.toString()
  companion object { fun random() = PlannedExpenseShareId(UUID.randomUUID()) }
}

@JvmInline value class PlannedExpenseShareParticipantId(val value: UUID) {
  override fun toString(): String = value.toString()
  companion object { fun random() = PlannedExpenseShareParticipantId(UUID.randomUUID()) }
}

enum class RecurringShareAllocationMode(val value: String) {
  PARTS("parts"),
  AMOUNTS("amounts");

  companion object {
    fun from(value: String) = entries.firstOrNull { it.value == value.trim().lowercase() }
      ?: throw IllegalArgumentException("Unsupported sharing allocation mode: $value")
  }
}

data class RecurringShareParticipantTemplate(
  val id: RecurringShareParticipantTemplateId,
  val personId: SharingPersonId,
  val parts: Int?,
  val fixedAmount: BigDecimal?,
  val reimbursable: Boolean,
  val order: Int,
) {
  init {
    require(order >= 0) { "participant order must not be negative" }
    require((parts != null) xor (fixedAmount != null)) { "participant allocation must use parts or amount" }
    if (parts != null) require(parts > 0) { "participant parts must be positive" }
    if (fixedAmount != null) require(fixedAmount > BigDecimal.ZERO) { "participant amount must be positive" }
  }
}

data class RecurringSharePlan(
  val id: RecurringSharePlanId,
  val recurringMovementRef: RecurringMovementRef,
  val payerPersonId: SharingPersonId,
  val mode: RecurringShareAllocationMode,
  val currency: String,
  val payerParts: Int?,
  val participants: List<RecurringShareParticipantTemplate>,
  val createdAt: Instant,
  val updatedAt: Instant,
) {
  init {
    require(currency.matches(Regex("^[A-Z]{3}$"))) { "sharing currency must be 3 uppercase letters" }
    require(participants.isNotEmpty()) { "sharing plan requires participants" }
    require(participants.map { it.personId }.toSet().size == participants.size) { "sharing plan cannot duplicate participants" }
    require(participants.map { it.order }.toSet().size == participants.size) { "sharing participant order must be unique" }
    when (mode) {
      RecurringShareAllocationMode.PARTS -> require(payerParts != null && payerParts > 0) { "payer parts must be positive" }
      RecurringShareAllocationMode.AMOUNTS -> require(payerParts == null) { "payer parts are not used for amount plans" }
    }
    require(participants.all { if (mode == RecurringShareAllocationMode.PARTS) it.parts != null else it.fixedAmount != null }) {
      "participant allocation does not match sharing mode"
    }
  }
}

enum class PlannedExpenseShareStatus { PENDING, MATERIALIZED, CANCELLED }

data class PlannedExpenseShareParticipant(
  val id: PlannedExpenseShareParticipantId,
  val personId: SharingPersonId,
  val parts: Int?,
  val amount: BigDecimal,
  val reimbursable: Boolean,
  val order: Int,
) {
  init {
    require(amount > BigDecimal.ZERO) { "planned participant amount must be positive" }
    require(parts == null || parts > 0) { "planned participant parts must be positive" }
  }
}

data class PlannedExpenseShare(
  val id: PlannedExpenseShareId,
  val expectedMovementRef: ExpectedMovementRef,
  val sourcePlanId: RecurringSharePlanId?,
  val payerPersonId: SharingPersonId,
  val mode: RecurringShareAllocationMode,
  val payerParts: Int?,
  val totalAmount: BigDecimal,
  val currency: String,
  val participants: List<PlannedExpenseShareParticipant>,
  val status: PlannedExpenseShareStatus,
  val materializedTransactionId: String?,
  val materializedShareId: ExpenseShareId?,
  val createdAt: Instant,
  val updatedAt: Instant,
) {
  init {
    require(totalAmount > BigDecimal.ZERO) { "planned share total must be positive" }
    require(participants.isNotEmpty()) { "planned share requires participants" }
    require(participants.map { it.personId }.toSet().size == participants.size) { "planned share cannot duplicate participants" }
    require(participants.sumOf { it.amount } <= totalAmount) { "planned participant amounts cannot exceed total" }
    when (mode) {
      RecurringShareAllocationMode.PARTS -> require(payerParts != null && payerParts > 0) { "planned payer parts must be positive" }
      RecurringShareAllocationMode.AMOUNTS -> require(payerParts == null) { "planned payer parts are not used for amount plans" }
    }
    require(status == PlannedExpenseShareStatus.MATERIALIZED == (materializedTransactionId != null && materializedShareId != null)) {
      "materialized planned share references must match status"
    }
  }

  fun materialize(transactionId: String, shareId: ExpenseShareId, at: Instant): PlannedExpenseShare {
    if (status == PlannedExpenseShareStatus.MATERIALIZED) {
      require(materializedTransactionId == transactionId) { "planned share belongs to another transaction" }
      return this
    }
    check(status == PlannedExpenseShareStatus.PENDING) { "Only pending planned shares can be materialized" }
    return copy(
      status = PlannedExpenseShareStatus.MATERIALIZED,
      materializedTransactionId = transactionId,
      materializedShareId = shareId,
      updatedAt = at,
    )
  }
}

interface CurrencyScaleResolver {
  fun scale(currency: String): Int
}

object DefaultCurrencyScaleResolver : CurrencyScaleResolver {
  override fun scale(currency: String): Int = if (currency.trim().uppercase() == "JPY") 0 else 2
}

interface ExpenseShareAllocationStrategy {
  fun allocate(total: BigDecimal, plan: RecurringSharePlan, scale: Int): List<BigDecimal>
}

class AmountExpenseShareAllocationStrategy : ExpenseShareAllocationStrategy {
  override fun allocate(total: BigDecimal, plan: RecurringSharePlan, scale: Int): List<BigDecimal> {
    val amounts = plan.participants.sortedBy { it.order }.map { it.fixedAmount!! }
    require(amounts.sumOf { it } <= total) { "participant amounts cannot exceed movement total" }
    return amounts
  }
}

class PartsExpenseShareAllocationStrategy : ExpenseShareAllocationStrategy {
  override fun allocate(total: BigDecimal, plan: RecurringSharePlan, scale: Int): List<BigDecimal> {
    val denominator = plan.payerParts!! + plan.participants.sumOf { it.parts!! }
    val unit = total.divide(BigDecimal(denominator), scale + 8, RoundingMode.DOWN)
    return plan.participants.sortedBy { it.order }.map {
      unit.multiply(BigDecimal(it.parts!!)).setScale(scale, RoundingMode.DOWN)
    }.also { require(it.sumOf { amount -> amount } <= total) { "participant allocation exceeds movement total" } }
  }
}
