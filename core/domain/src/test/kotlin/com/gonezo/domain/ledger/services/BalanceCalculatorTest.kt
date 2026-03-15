package com.gonezo.domain.ledger.services

import com.gonezo.domain.ledger.AccountId
import com.gonezo.domain.ledger.Transaction
import com.gonezo.domain.ledger.TransactionId
import com.gonezo.domain.shared.Money
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class BalanceCalculatorTest {

  private val calculator = BalanceCalculator()

  @Test
  fun `calculates net balance from posted transactions`() {
    val accountId = AccountId.random()
    val income = Transaction.recordIncome(
      id = TransactionId.random(),
      accountId = accountId,
      amount = Money(BigDecimal("1200.00"), "USD"),
      occurredAt = Instant.parse("2026-03-01T10:00:00Z"),
      description = "Salary",
      merchant = null,
      categoryId = null,
    )
    val expense = Transaction.recordExpense(
      id = TransactionId.random(),
      accountId = accountId,
      amount = Money(BigDecimal("80.00"), "USD"),
      occurredAt = Instant.parse("2026-03-15T10:00:00Z"),
      description = "Supermarket",
      merchant = null,
      categoryId = null,
    )
    val voidedExpense = Transaction.recordExpense(
      id = TransactionId.random(),
      accountId = accountId,
      amount = Money(BigDecimal("50.00"), "USD"),
      occurredAt = Instant.parse("2026-03-10T10:00:00Z"),
      description = "Void me",
      merchant = null,
      categoryId = null,
    ).void()

    val balance = calculator.calculate(currency = "USD", transactions = listOf(income, expense, voidedExpense))
    assertThat(balance.amount).isEqualByComparingTo(BigDecimal("1120.00"))
    assertThat(balance.currency).isEqualTo("USD")
  }
}
