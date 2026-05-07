package com.gonezo.recurrence.domain

import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.math.BigDecimal
import java.time.Instant
import java.time.ZoneId

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
  val categoryId: String?,
  val splitItems: List<SplitItem> = emptyList(),
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
  data class SplitItem(
    val id: String,
    val name: String,
    val amount: BigDecimal,
  )

  init {
    require(sourceAccountId.isNotBlank()) { "sourceAccountId is required" }
    require(type == RecurringMovementType.TRANSFER || targetAccountId.isNullOrBlank()) {
      "targetAccountId is only supported for transfer recurring movements"
    }
    require(type != RecurringMovementType.TRANSFER || !targetAccountId.isNullOrBlank()) {
      "targetAccountId is required for transfer recurring movements"
    }
    require(amount > BigDecimal.ZERO) { "amount must be greater than 0" }
    require(currency.isNotBlank()) { "currency is required" }
    require(zoneId.isNotBlank()) { "zoneId is required" }
    if (destinationAmount != null) {
      require(destinationAmount > BigDecimal.ZERO) { "destinationAmount must be greater than 0" }
      require(!destinationCurrency.isNullOrBlank()) { "destinationCurrency is required when destinationAmount is set" }
    }
    if (exchangeRate != null) {
      require(exchangeRate > BigDecimal.ZERO) { "exchangeRate must be greater than 0" }
    }
    require(splitItems.all { it.id.isNotBlank() }) { "split item id is required" }
    require(splitItems.all { it.name.isNotBlank() }) { "split item name is required" }
    require(splitItems.all { it.amount > BigDecimal.ZERO }) { "split item amount must be greater than 0" }
    if (splitItems.isNotEmpty()) {
      val splitTotal = splitItems.fold(BigDecimal.ZERO) { acc, item -> acc + item.amount }
      require(splitTotal.compareTo(amount) == 0) { "split items must add up to amount" }
    }
    require(generatedOccurrences >= 0) { "generatedOccurrences must be greater or equal to 0" }
    require(!(status == RecurringMovementStatus.ACTIVE && nextDueAt == null)) {
      "active recurring movement must have nextDueAt"
    }
    require(!(status != RecurringMovementStatus.ACTIVE && nextDueAt != null)) {
      "non-active recurring movement cannot have nextDueAt"
    }
    require(!(deactivatedAt != null && completedAt != null)) {
      "recurring movement cannot be deactivated and completed at the same time"
    }
  }

  fun deactivate(at: Instant): RecurringMovement {
    if (status == RecurringMovementStatus.DEACTIVATED || status == RecurringMovementStatus.COMPLETED) {
      return this
    }
    return copy(
      status = RecurringMovementStatus.DEACTIVATED,
      nextDueAt = null,
      updatedAt = at,
      deactivatedAt = at,
      completedAt = null,
    )
  }

  fun update(
    type: RecurringMovementType,
    sourceAccountId: String,
    targetAccountId: String?,
    amount: BigDecimal,
    currency: String,
    destinationAmount: BigDecimal?,
    destinationCurrency: String?,
    exchangeRate: BigDecimal?,
    description: String?,
    merchant: String?,
    categoryId: String?,
    splitItems: List<SplitItem> = emptyList(),
    rule: RecurrenceRule,
    recurrenceEnd: RecurrenceEnd,
    startAt: Instant,
    zoneId: String,
    updatedAt: Instant,
    scheduleCalculator: RecurrenceScheduleCalculator,
  ): RecurringMovement {
    val updated = create(
      id = id,
      type = type,
      sourceAccountId = sourceAccountId,
      targetAccountId = targetAccountId,
      amount = amount,
      currency = currency,
      destinationAmount = destinationAmount,
      destinationCurrency = destinationCurrency,
      exchangeRate = exchangeRate,
      description = description,
      merchant = merchant,
      categoryId = categoryId,
      splitItems = splitItems,
      rule = rule,
      recurrenceEnd = recurrenceEnd,
      startAt = startAt,
      zoneId = zoneId,
      createdAt = createdAt,
      scheduleCalculator = scheduleCalculator,
    )
    return updated.copy(
      generatedOccurrences = generatedOccurrences,
      updatedAt = updatedAt,
      deactivatedAt = null,
      completedAt = if (updated.status == RecurringMovementStatus.COMPLETED) updatedAt else null,
    )
  }

  fun advanceAfterDue(
    dueAt: Instant,
    advancedAt: Instant,
    scheduleCalculator: RecurrenceScheduleCalculator,
  ): RecurringMovement {
    check(status == RecurringMovementStatus.ACTIVE) { "Only active recurring movements can advance" }
    check(nextDueAt == dueAt) { "Recurring movement dueAt mismatch. expected=$nextDueAt actual=$dueAt" }

    val newGeneratedOccurrences = generatedOccurrences + 1
    if (isCompletionByCount(newGeneratedOccurrences)) {
      return copy(
        nextDueAt = null,
        status = RecurringMovementStatus.COMPLETED,
        generatedOccurrences = newGeneratedOccurrences,
        updatedAt = advancedAt,
        completedAt = advancedAt,
      )
    }

    val nextDue = scheduleCalculator.nextDueAt(startAt, zoneId, dueAt, rule)
    val nextDueDate = nextDue.atZone(ZoneId.of(zoneId)).toLocalDate()
    if (isCompletionByDate(nextDueDate)) {
      return copy(
        nextDueAt = null,
        status = RecurringMovementStatus.COMPLETED,
        generatedOccurrences = newGeneratedOccurrences,
        updatedAt = advancedAt,
        completedAt = advancedAt,
      )
    }

    return copy(
      nextDueAt = nextDue,
      status = RecurringMovementStatus.ACTIVE,
      generatedOccurrences = newGeneratedOccurrences,
      updatedAt = advancedAt,
    )
  }

  private fun isCompletionByCount(generatedCountAfterAdvance: Int): Boolean =
    when (val end = recurrenceEnd) {
      is RecurrenceEnd.AfterOccurrences -> generatedCountAfterAdvance >= end.count
      else -> false
    }

  private fun isCompletionByDate(nextDueDate: java.time.LocalDate): Boolean =
    when (val end = recurrenceEnd) {
      is RecurrenceEnd.OnDate -> nextDueDate.isAfter(end.date)
      else -> false
    }

  companion object {
    fun create(
      id: RecurringMovementId,
      type: RecurringMovementType,
      sourceAccountId: String,
      targetAccountId: String?,
      amount: BigDecimal,
      currency: String,
      destinationAmount: BigDecimal?,
      destinationCurrency: String?,
      exchangeRate: BigDecimal?,
      description: String?,
      merchant: String?,
      categoryId: String? = null,
      splitItems: List<SplitItem> = emptyList(),
      rule: RecurrenceRule,
      recurrenceEnd: RecurrenceEnd,
      startAt: Instant,
      zoneId: String,
      createdAt: Instant,
      scheduleCalculator: RecurrenceScheduleCalculator,
    ): RecurringMovement {
      val firstDueAt = scheduleCalculator.firstDueAt(startAt, zoneId, rule)
      val firstDueDate = firstDueAt.atZone(ZoneId.of(zoneId)).toLocalDate()
      val completedAtCreation = when (recurrenceEnd) {
        is RecurrenceEnd.OnDate -> firstDueDate.isAfter(recurrenceEnd.date)
        else -> false
      }

      return RecurringMovement(
        id = id,
        type = type,
        sourceAccountId = sourceAccountId,
        targetAccountId = targetAccountId?.trim(),
        amount = amount,
        currency = currency.trim().uppercase(),
        destinationAmount = destinationAmount,
        destinationCurrency = destinationCurrency?.trim()?.uppercase(),
        exchangeRate = exchangeRate,
        description = description?.trim()?.ifBlank { null },
        merchant = merchant?.trim()?.ifBlank { null },
        categoryId = categoryId?.trim()?.ifBlank { null },
        splitItems = splitItems.map {
          SplitItem(
            id = it.id.trim(),
            name = it.name.trim(),
            amount = it.amount,
          )
        },
        rule = rule,
        recurrenceEnd = recurrenceEnd,
        startAt = startAt,
        zoneId = zoneId.trim(),
        nextDueAt = if (completedAtCreation) null else firstDueAt,
        status = if (completedAtCreation) RecurringMovementStatus.COMPLETED else RecurringMovementStatus.ACTIVE,
        generatedOccurrences = 0,
        createdAt = createdAt,
        updatedAt = createdAt,
        deactivatedAt = null,
        completedAt = if (completedAtCreation) createdAt else null,
      )
    }
  }
}
