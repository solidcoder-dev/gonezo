package com.gonezo.domain.ledger

import com.gonezo.domain.shared.Money
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class TransactionAggregateTest {

  @Test
  fun `records posted expense`() {
    val tx = Transaction.recordExpense(
      id = TransactionId.random(),
      accountId = AccountId.random(),
      amount = Money(BigDecimal("80.00"), "USD"),
      occurredAt = Instant.parse("2026-03-15T09:00:00Z"),
      description = "Supermercado",
      merchant = "Mercadona",
      categoryId = null,
    )

    assertThat(tx.type).isEqualTo(TransactionType.EXPENSE)
    assertThat(tx.status).isEqualTo(TransactionStatus.POSTED)
    assertThat(tx.items).isEmpty()
  }

  @Test
  fun `rejects non positive amounts`() {
    assertThatThrownBy {
      Transaction.recordIncome(
        id = TransactionId.random(),
        accountId = AccountId.random(),
        amount = Money(BigDecimal.ZERO, "USD"),
        occurredAt = Instant.parse("2026-03-15T09:00:00Z"),
        description = "Salary",
        merchant = null,
        categoryId = null,
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `draft with items can be posted only when total matches`() {
    val draft = Transaction.createExpenseDraft(
      id = TransactionId.random(),
      accountId = AccountId.random(),
      amount = Money(BigDecimal("80.00"), "USD"),
      occurredAt = Instant.parse("2026-03-15T09:00:00Z"),
      description = "Mercadona",
      merchant = "Mercadona",
      categoryId = null,
    )
      .addItem(
        TransactionItem.create(
          id = TransactionItemId.random(),
          name = "Comida",
          amount = Money(BigDecimal("50.00"), "USD"),
          categoryId = null,
          note = null,
        ),
      )
      .addItem(
        TransactionItem.create(
          id = TransactionItemId.random(),
          name = "Limpieza",
          amount = Money(BigDecimal("20.00"), "USD"),
          categoryId = null,
          note = null,
        ),
      )

    assertThatThrownBy { draft.post() }.isInstanceOf(IllegalStateException::class.java)

    val posted = draft.addItem(
      TransactionItem.create(
        id = TransactionItemId.random(),
        name = "Farmacia",
        amount = Money(BigDecimal("10.00"), "USD"),
        categoryId = null,
        note = null,
      ),
    ).post()

    assertThat(posted.status).isEqualTo(TransactionStatus.POSTED)
    assertThat(posted.items).hasSize(3)
  }

  @Test
  fun `posts draft when total matches even with different decimal scales`() {
    val draft = Transaction.createExpenseDraft(
      id = TransactionId.random(),
      accountId = AccountId.random(),
      amount = Money(BigDecimal("80"), "USD"),
      occurredAt = Instant.parse("2026-03-15T09:00:00Z"),
      description = "Groceries",
      merchant = "Store",
      categoryId = null,
    )
      .addItem(
        TransactionItem.create(
          id = TransactionItemId.random(),
          name = "A",
          amount = Money(BigDecimal("50.00"), "USD"),
          categoryId = null,
          note = null,
        ),
      )
      .addItem(
        TransactionItem.create(
          id = TransactionItemId.random(),
          name = "B",
          amount = Money(BigDecimal("30.00"), "USD"),
          categoryId = null,
          note = null,
        ),
      )

    val posted = draft.post()
    assertThat(posted.status).isEqualTo(TransactionStatus.POSTED)
  }

  @Test
  fun `voids posted transaction`() {
    val posted = Transaction.recordExpense(
      id = TransactionId.random(),
      accountId = AccountId.random(),
      amount = Money(BigDecimal("19.90"), "USD"),
      occurredAt = Instant.parse("2026-03-15T09:00:00Z"),
      description = "Lunch",
      merchant = "Cafe",
      categoryId = null,
    )

    val voided = posted.void()
    assertThat(voided.status).isEqualTo(TransactionStatus.VOIDED)
  }

  @Test
  fun `records linked transfer out and in with opposite signed amounts`() {
    val fromAccountId = AccountId.random()
    val toAccountId = AccountId.random()
    val transferInId = TransactionId.random()
    val transferOutId = TransactionId.random()

    val out = Transaction.recordTransferOut(
      id = transferOutId,
      accountId = fromAccountId,
      amount = Money(BigDecimal("50.00"), "USD"),
      occurredAt = Instant.parse("2026-03-15T09:00:00Z"),
      description = "Move to savings",
      linkedTransactionId = transferInId,
    )
    val incoming = Transaction.recordTransferIn(
      id = transferInId,
      accountId = toAccountId,
      amount = Money(BigDecimal("50.00"), "USD"),
      occurredAt = Instant.parse("2026-03-15T09:00:00Z"),
      description = "Move from wallet",
      linkedTransactionId = transferOutId,
    )

    assertThat(out.type).isEqualTo(TransactionType.TRANSFER_OUT)
    assertThat(incoming.type).isEqualTo(TransactionType.TRANSFER_IN)
    assertThat(out.linkedTransactionId).isEqualTo(transferInId)
    assertThat(incoming.linkedTransactionId).isEqualTo(transferOutId)
    assertThat(out.signedAmount()).isEqualByComparingTo(BigDecimal("-50.00"))
    assertThat(incoming.signedAmount()).isEqualByComparingTo(BigDecimal("50.00"))
  }
}
