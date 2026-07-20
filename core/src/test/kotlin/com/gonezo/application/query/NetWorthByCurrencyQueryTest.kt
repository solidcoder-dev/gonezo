package com.gonezo.application.query

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.ledger.domain.AccountId
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class NetWorthByCurrencyQueryTest {
  @Test
  fun `aggregates precise posted balances and orders preferred currency first`() {
    val eurOne = account("00000000-0000-4000-8000-000000000001", "EUR")
    val eurTwo = account("00000000-0000-4000-8000-000000000002", "EUR")
    val brl = account("00000000-0000-4000-8000-000000000003", "BRL")
    val result = service(
      accounts = listOf(eurOne, eurTwo, brl),
      transactions = listOf(
        transaction("income", "0.10", "EUR", "2026-01-01T00:00:00Z"),
        transaction("income", "0.20", "EUR", "2026-02-01T00:00:00Z"),
        transaction("expense", "1.00", "EUR", "2026-03-01T00:00:00Z"),
        transaction("income", "500.00", "BRL", "2026-04-01T00:00:00Z", accountId = brl.id),
        transaction("income", "999.00", "EUR", "2026-04-01T00:00:00Z", status = "draft"),
        transaction("income", "999.00", "EUR", "2026-05-01T00:00:00Z", status = "voided"),
      ),
    ).execute(
      NetWorthByCurrencyQuery(
        now = Instant.parse("2026-06-22T00:00:00Z"),
        preferredAccountId = brl.id,
      ),
    )

    assertThat(result.items.map { it.currency.value }).containsExactly("BRL", "EUR")
    assertThat(result.items[0].isPreferred).isTrue()
    assertThat(result.items[0].accountCount).isEqualTo(1)
    assertThat(result.items[1].accountCount).isEqualTo(2)
    assertThat(result.items[1].balance.amount).isEqualByComparingTo(BigDecimal("-0.70"))
    assertThat(result.items[1].trend).hasSize(6)
  }

  private fun service(
    accounts: List<NetWorthAccountRead>,
    transactions: List<NetWorthTransactionRead>,
  ) = GetNetWorthByCurrencyService(object : NetWorthByCurrencyReadPort {
    override fun read() = NetWorthByCurrencyReadData(accounts, transactions)
  })

  private fun account(id: String, currency: String) = NetWorthAccountRead(
    AccountId(UUID.fromString(id)),
    CurrencyCode.from(currency),
  )

  private fun transaction(
    type: String,
    amount: String,
    currency: String,
    occurredAt: String,
    status: String = "posted",
    accountId: AccountId = AccountId(UUID.fromString("00000000-0000-4000-8000-000000000001")),
  ) = NetWorthTransactionRead(
    accountId = accountId,
    type = type,
    status = status,
    amount = Money(BigDecimal(amount), currency),
    occurredAt = Instant.parse(occurredAt),
  )
}
