package com.gonezo.expected.domain

import java.math.BigDecimal
import java.time.Instant

data class ExpectedMovement(
  val id: ExpectedMovementId,
  val accountId: String,
  val type: ExpectedMovementType,
  val amount: BigDecimal,
  val currency: String,
  val expectedAt: Instant,
  val description: String?,
  val merchant: String?,
  val categoryId: String?,
  val originOccurrenceId: String?,
  val splitItems: List<SplitItem> = emptyList(),
  val status: ExpectedMovementStatus,
  val resolvedTransactionId: String?,
  val createdAt: Instant,
  val updatedAt: Instant,
  val resolvedAt: Instant?,
  val dismissedAt: Instant?,
) {
  data class SplitItem(
    val id: String,
    val name: String,
    val amount: BigDecimal,
  )

  init {
    require(accountId.isNotBlank()) { "accountId is required" }
    require(amount > BigDecimal.ZERO) { "amount must be greater than 0" }
    require(currency.matches(Regex("^[A-Z]{3}$"))) { "currency must be 3 uppercase letters" }
    require(originOccurrenceId == null || originOccurrenceId.isNotBlank()) { "originOccurrenceId cannot be blank" }
    require(splitItems.all { it.id.isNotBlank() }) { "split item id is required" }
    require(splitItems.all { it.name.isNotBlank() }) { "split item name is required" }
    require(splitItems.all { it.amount > BigDecimal.ZERO }) { "split item amount must be greater than 0" }
    if (splitItems.isNotEmpty()) {
      val splitTotal = splitItems.fold(BigDecimal.ZERO) { acc, item -> acc + item.amount }
      require(splitTotal.compareTo(amount) == 0) { "split items must add up to amount" }
    }
    require(!(status == ExpectedMovementStatus.PENDING && resolvedTransactionId != null)) {
      "pending expected movement cannot have resolved transaction"
    }
    require(!(status == ExpectedMovementStatus.RESOLVED && resolvedTransactionId.isNullOrBlank())) {
      "resolved expected movement requires resolvedTransactionId"
    }
    require(!(status == ExpectedMovementStatus.RESOLVED && resolvedAt == null)) {
      "resolved expected movement requires resolvedAt"
    }
    require(!(status == ExpectedMovementStatus.DISMISSED && dismissedAt == null)) {
      "dismissed expected movement requires dismissedAt"
    }
    require(!(resolvedAt != null && dismissedAt != null)) {
      "expected movement cannot be both resolved and dismissed"
    }
  }

  fun resolve(transactionId: String, at: Instant): ExpectedMovement {
    check(status == ExpectedMovementStatus.PENDING) { "Only pending expected movements can be resolved" }
    val resolvedTransactionId = transactionId.trim()
    require(resolvedTransactionId.isNotBlank()) { "transactionId is required" }

    return copy(
      status = ExpectedMovementStatus.RESOLVED,
      resolvedTransactionId = resolvedTransactionId,
      updatedAt = at,
      resolvedAt = at,
      dismissedAt = null,
    )
  }

  fun dismiss(at: Instant): ExpectedMovement {
    check(status == ExpectedMovementStatus.PENDING) { "Only pending expected movements can be dismissed" }

    return copy(
      status = ExpectedMovementStatus.DISMISSED,
      resolvedTransactionId = null,
      updatedAt = at,
      resolvedAt = null,
      dismissedAt = at,
    )
  }

  companion object {
    fun create(
      id: ExpectedMovementId,
      accountId: String,
      type: ExpectedMovementType,
      amount: BigDecimal,
      currency: String,
      expectedAt: Instant,
      description: String?,
      merchant: String?,
      categoryId: String?,
      originOccurrenceId: String? = null,
      splitItems: List<SplitItem> = emptyList(),
      createdAt: Instant,
    ): ExpectedMovement = ExpectedMovement(
      id = id,
      accountId = accountId.trim(),
      type = type,
      amount = amount,
      currency = currency.trim().uppercase(),
      expectedAt = expectedAt,
      description = description?.trim()?.ifBlank { null },
      merchant = merchant?.trim()?.ifBlank { null },
      categoryId = categoryId?.trim()?.ifBlank { null },
      originOccurrenceId = originOccurrenceId?.trim()?.ifBlank { null },
      splitItems = splitItems.map {
        SplitItem(
          id = it.id.trim(),
          name = it.name.trim(),
          amount = it.amount,
        )
      },
      status = ExpectedMovementStatus.PENDING,
      resolvedTransactionId = null,
      createdAt = createdAt,
      updatedAt = createdAt,
      resolvedAt = null,
      dismissedAt = null,
    )
  }
}
