package com.gonezo.domain.ledger

import com.gonezo.domain.shared.Money
import java.math.BigDecimal
import java.time.Instant

data class Transaction(
  val id: TransactionId,
  val accountId: AccountId,
  val type: TransactionType,
  val amount: Money,
  val occurredAt: Instant,
  val description: String?,
  val merchant: String?,
  val categoryId: CategoryId?,
  val status: TransactionStatus,
  val items: List<TransactionItem>,
  val linkedTransactionId: TransactionId?,
) {
  init {
    require(amount.amount > BigDecimal.ZERO) { "transaction amount must be > 0" }
    require(amount.currency.isNotBlank()) { "transaction currency is required" }
    if (type == TransactionType.TRANSFER_OUT || type == TransactionType.TRANSFER_IN) {
      require(linkedTransactionId != null) { "linked transaction id is required for transfers" }
      require(items.isEmpty()) { "transfers cannot contain items" }
    }
    require(items.all { it.amount.currency == amount.currency }) { "all items must match transaction currency" }
    if (status == TransactionStatus.DRAFT) {
      require(itemsTotal() <= amount.amount) { "draft items cannot exceed transaction amount" }
    } else if (items.isNotEmpty()) {
      require(itemsTotal().compareTo(amount.amount) == 0) { "sum(items) must match transaction amount" }
    }
  }

  fun addItem(item: TransactionItem): Transaction {
    require(status == TransactionStatus.DRAFT) { "items can only be modified in draft status" }
    require(item.amount.currency == amount.currency) { "item currency must match transaction currency" }
    require(items.none { it.id == item.id }) { "duplicate item id" }
    return copy(items = items + item)
  }

  fun removeItem(itemId: TransactionItemId): Transaction {
    require(status == TransactionStatus.DRAFT) { "items can only be modified in draft status" }
    return copy(items = items.filterNot { it.id == itemId })
  }

  fun post(): Transaction {
    require(status == TransactionStatus.DRAFT) { "only draft transactions can be posted" }
    if (items.isNotEmpty()) {
      check(itemsTotal().compareTo(amount.amount) == 0) { "sum(items) must match transaction amount before posting" }
    }
    return copy(status = TransactionStatus.POSTED)
  }

  fun void(): Transaction {
    require(status == TransactionStatus.POSTED) { "only posted transactions can be voided" }
    return copy(status = TransactionStatus.VOIDED)
  }

  fun signedAmount(): BigDecimal {
    if (status == TransactionStatus.VOIDED) {
      return BigDecimal.ZERO
    }
    return when (type) {
      TransactionType.INCOME -> amount.amount
      TransactionType.EXPENSE -> amount.amount.negate()
      TransactionType.TRANSFER_IN -> amount.amount
      TransactionType.TRANSFER_OUT -> amount.amount.negate()
      TransactionType.TRANSFER -> BigDecimal.ZERO
    }
  }

  private fun itemsTotal(): BigDecimal = items.fold(BigDecimal.ZERO) { acc, item -> acc + item.amount.amount }

  companion object {
    fun recordIncome(
      id: TransactionId,
      accountId: AccountId,
      amount: Money,
      occurredAt: Instant,
      description: String?,
      merchant: String?,
      categoryId: CategoryId?,
    ): Transaction = create(
      id = id,
      accountId = accountId,
      type = TransactionType.INCOME,
      amount = amount,
      occurredAt = occurredAt,
      description = description,
      merchant = merchant,
      categoryId = categoryId,
      status = TransactionStatus.POSTED,
      items = emptyList(),
      linkedTransactionId = null,
    )

    fun recordExpense(
      id: TransactionId,
      accountId: AccountId,
      amount: Money,
      occurredAt: Instant,
      description: String?,
      merchant: String?,
      categoryId: CategoryId?,
    ): Transaction = create(
      id = id,
      accountId = accountId,
      type = TransactionType.EXPENSE,
      amount = amount,
      occurredAt = occurredAt,
      description = description,
      merchant = merchant,
      categoryId = categoryId,
      status = TransactionStatus.POSTED,
      items = emptyList(),
      linkedTransactionId = null,
    )

    fun createExpenseDraft(
      id: TransactionId,
      accountId: AccountId,
      amount: Money,
      occurredAt: Instant,
      description: String?,
      merchant: String?,
      categoryId: CategoryId?,
    ): Transaction = create(
      id = id,
      accountId = accountId,
      type = TransactionType.EXPENSE,
      amount = amount,
      occurredAt = occurredAt,
      description = description,
      merchant = merchant,
      categoryId = categoryId,
      status = TransactionStatus.DRAFT,
      items = emptyList(),
      linkedTransactionId = null,
    )

    fun recordTransferOut(
      id: TransactionId,
      accountId: AccountId,
      amount: Money,
      occurredAt: Instant,
      description: String?,
      linkedTransactionId: TransactionId,
    ): Transaction = create(
      id = id,
      accountId = accountId,
      type = TransactionType.TRANSFER_OUT,
      amount = amount,
      occurredAt = occurredAt,
      description = description,
      merchant = null,
      categoryId = null,
      status = TransactionStatus.POSTED,
      items = emptyList(),
      linkedTransactionId = linkedTransactionId,
    )

    fun recordTransferIn(
      id: TransactionId,
      accountId: AccountId,
      amount: Money,
      occurredAt: Instant,
      description: String?,
      linkedTransactionId: TransactionId,
    ): Transaction = create(
      id = id,
      accountId = accountId,
      type = TransactionType.TRANSFER_IN,
      amount = amount,
      occurredAt = occurredAt,
      description = description,
      merchant = null,
      categoryId = null,
      status = TransactionStatus.POSTED,
      items = emptyList(),
      linkedTransactionId = linkedTransactionId,
    )

    private fun create(
      id: TransactionId,
      accountId: AccountId,
      type: TransactionType,
      amount: Money,
      occurredAt: Instant,
      description: String?,
      merchant: String?,
      categoryId: CategoryId?,
      status: TransactionStatus,
      items: List<TransactionItem>,
      linkedTransactionId: TransactionId?,
    ): Transaction = Transaction(
      id = id,
      accountId = accountId,
      type = type,
      amount = amount,
      occurredAt = occurredAt,
      description = description?.trim()?.ifBlank { null },
      merchant = merchant?.trim()?.ifBlank { null },
      categoryId = categoryId,
      status = status,
      items = items,
      linkedTransactionId = linkedTransactionId,
    )
  }
}
