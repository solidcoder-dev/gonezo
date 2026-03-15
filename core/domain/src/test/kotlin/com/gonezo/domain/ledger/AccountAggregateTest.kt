package com.gonezo.domain.ledger

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant

class AccountAggregateTest {

  @Test
  fun `opens account as active`() {
    val openedAt = Instant.parse("2026-03-15T10:00:00Z")
    val account = Account.open(
      id = AccountId.random(),
      name = "Main account",
      type = AccountType.CASH,
      currency = CurrencyCode("USD"),
      createdAt = openedAt,
    )

    assertThat(account.status).isEqualTo(AccountStatus.ACTIVE)
    assertThat(account.archivedAt).isNull()
    assertThat(account.createdAt).isEqualTo(openedAt)
  }

  @Test
  fun `does not allow blank name`() {
    assertThatThrownBy {
      Account.open(
        id = AccountId.random(),
        name = " ",
        type = AccountType.BANK,
        currency = CurrencyCode("USD"),
        createdAt = Instant.parse("2026-03-15T10:00:00Z"),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `archived account rejects new postings`() {
    val account = Account.open(
      id = AccountId.random(),
      name = "Main account",
      type = AccountType.CASH,
      currency = CurrencyCode("USD"),
      createdAt = Instant.parse("2026-03-15T10:00:00Z"),
    ).archive(Instant.parse("2026-03-16T10:00:00Z"))

    assertThat(account.status).isEqualTo(AccountStatus.ARCHIVED)

    assertThatThrownBy {
      account.ensureCanRecordTransactions()
    }.isInstanceOf(IllegalStateException::class.java)
  }
}
