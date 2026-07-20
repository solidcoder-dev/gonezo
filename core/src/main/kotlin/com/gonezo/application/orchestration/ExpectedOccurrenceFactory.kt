package com.gonezo.application.orchestration

import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementType
import java.math.BigDecimal
import java.time.Instant

data class RecurringOccurrenceSnapshot(
  val recurringMovementId: String,
  val occurrenceId: String,
  val accountId: String,
  val movementType: String,
  val amount: BigDecimal,
  val currency: String,
  val dueAt: Instant,
  val description: String?,
  val merchant: String?,
  val categoryId: String?,
  val createdAt: Instant,
  val items: List<Item>,
  val tagNames: List<String> = emptyList(),
) {
  data class Item(
    val templateItemId: String,
    val name: String,
    val amount: BigDecimal,
  )
}

data class ExpectedMovementDraft(
  val id: ExpectedMovementId,
  val accountId: String,
  val type: ExpectedMovementType,
  val amount: BigDecimal,
  val currency: String,
  val expectedAt: Instant,
  val description: String?,
  val merchant: String?,
  val categoryId: String?,
  val originOccurrenceId: String,
  val originRecurringMovementId: String,
  val splitItems: List<ExpectedMovement.SplitItem>,
  val createdAt: Instant,
  val tagNames: List<String> = emptyList(),
)

interface ExpectedOccurrenceFactory {
  fun create(source: RecurringOccurrenceSnapshot): ExpectedMovementDraft
}

fun interface ExpectedMovementIdGenerator {
  fun generate(): ExpectedMovementId
}

fun interface ExpectedMovementItemIdGenerator {
  fun generate(): String
}

class UuidExpectedMovementIdGenerator : ExpectedMovementIdGenerator {
  override fun generate(): ExpectedMovementId = ExpectedMovementId.from(java.util.UUID.randomUUID().toString())
}

class UuidExpectedMovementItemIdGenerator : ExpectedMovementItemIdGenerator {
  override fun generate(): String = java.util.UUID.randomUUID().toString()
}

class DefaultExpectedOccurrenceFactory(
  private val expectedMovementIdGenerator: ExpectedMovementIdGenerator = UuidExpectedMovementIdGenerator(),
  private val expectedMovementItemIdGenerator: ExpectedMovementItemIdGenerator = UuidExpectedMovementItemIdGenerator(),
) : ExpectedOccurrenceFactory {
  override fun create(source: RecurringOccurrenceSnapshot): ExpectedMovementDraft = ExpectedMovementDraft(
    id = expectedMovementIdGenerator.generate(),
    accountId = source.accountId,
    type = ExpectedMovementType.from(source.movementType),
    amount = source.amount,
    currency = source.currency,
    expectedAt = source.dueAt,
    description = source.description,
    merchant = source.merchant,
    categoryId = source.categoryId,
    originOccurrenceId = source.occurrenceId,
    originRecurringMovementId = source.recurringMovementId,
    splitItems = source.items.map { item ->
      ExpectedMovement.SplitItem(
        id = expectedMovementItemIdGenerator.generate(),
        sourceTemplateItemId = item.templateItemId,
        name = item.name,
        amount = item.amount,
      )
    },
    createdAt = source.createdAt,
    tagNames = source.tagNames,
  )
}
