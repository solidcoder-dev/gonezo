package com.gonezo.domain.expected

import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ExpectedMovementType
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class ExpectedMovementAggregateTest {
  @Test
  fun `creates pending expected income without touching ledger state`() {
    val movement = expectedMovement()

    assertThat(movement.status).isEqualTo(ExpectedMovementStatus.PENDING)
    assertThat(movement.type).isEqualTo(ExpectedMovementType.INCOME)
    assertThat(movement.amount).isEqualByComparingTo(BigDecimal("120.00"))
    assertThat(movement.currency).isEqualTo("EUR")
    assertThat(movement.expectedAt).isEqualTo(Instant.parse("2026-05-05T09:00:00Z"))
    assertThat(movement.resolvedTransactionId).isNull()
  }

  @Test
  fun `resolve links expected movement to the posted ledger transaction`() {
    val resolved = expectedMovement().resolve(
      transactionId = "tx-posted-1",
      at = Instant.parse("2026-05-04T12:00:00Z"),
    )

    assertThat(resolved.status).isEqualTo(ExpectedMovementStatus.RESOLVED)
    assertThat(resolved.resolvedTransactionId).isEqualTo("tx-posted-1")
    assertThat(resolved.resolvedAt).isEqualTo(Instant.parse("2026-05-04T12:00:00Z"))
    assertThat(resolved.updatedAt).isEqualTo(Instant.parse("2026-05-04T12:00:00Z"))
  }

  @Test
  fun `dismiss removes expected movement from pending cashflow without deleting it`() {
    val dismissed = expectedMovement().dismiss(Instant.parse("2026-05-06T10:00:00Z"))

    assertThat(dismissed.status).isEqualTo(ExpectedMovementStatus.DISMISSED)
    assertThat(dismissed.dismissedAt).isEqualTo(Instant.parse("2026-05-06T10:00:00Z"))
    assertThat(dismissed.updatedAt).isEqualTo(Instant.parse("2026-05-06T10:00:00Z"))
  }

  @Test
  fun `resolved expected movement cannot be dismissed again`() {
    val resolved = expectedMovement().resolve(
      transactionId = "tx-posted-1",
      at = Instant.parse("2026-05-04T12:00:00Z"),
    )

    assertThatThrownBy { resolved.dismiss(Instant.parse("2026-05-06T10:00:00Z")) }
      .isInstanceOf(IllegalStateException::class.java)
      .hasMessageContaining("Only pending expected movements can be dismissed")
  }

  @Test
  fun `expected movements require positive amount`() {
    assertThatThrownBy {
      expectedMovement(amount = BigDecimal.ZERO)
    }
      .isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("amount must be greater than 0")
  }

  @Test
  fun `expected movements only support income and expense`() {
    assertThatThrownBy {
      ExpectedMovementType.from("transfer")
    }
      .isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("Unsupported expected movement type")
  }

  private fun expectedMovement(
    amount: BigDecimal = BigDecimal("120.00"),
  ): ExpectedMovement = ExpectedMovement.create(
    id = ExpectedMovementId.random(),
    accountId = "account-1",
    type = ExpectedMovementType.INCOME,
    amount = amount,
    currency = "eur",
    expectedAt = Instant.parse("2026-05-05T09:00:00Z"),
    description = "Client payment",
    merchant = "Client",
    categoryId = "cat-income",
    createdAt = Instant.parse("2026-05-01T09:00:00Z"),
  )
}
