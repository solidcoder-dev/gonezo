package com.gonezo.application.query

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.ledger.domain.AccountId
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class NetWorthTrendCalculatorTest {
    private val calculator = NetWorthTrendCalculator()
    private val eur = CurrencyCode.from("EUR")
    private val accountId = AccountId(UUID.fromString("00000000-0000-4000-8000-000000000001"))

    @Test
    fun `returns every month from first transaction through current month`() {
        val trend = calculator.calculate(
            transactions = listOf(
                transaction("income", "100.00", "2022-03-12T00:00:00Z"),
                transaction("expense", "20.00", "2024-07-01T00:00:00Z"),
            ),
            currency = eur,
            now = Instant.parse("2026-09-15T12:00:00Z"),
        )

        assertThat(trend).hasSize(55)
        assertThat(trend.first().period).isEqualTo("2022-03")
        assertThat(trend.last().period).isEqualTo("2026-09")
        assertThat(trend[1].balance.amount).isEqualByComparingTo("100.00")
        assertThat(trend.first { it.period == "2024-07" }.balance.amount).isEqualByComparingTo("80.00")
        assertThat(trend.last().balance.amount).isEqualByComparingTo("80.00")
    }

    @Test
    fun `aggregates transaction effects and carries balance through empty months`() {
        val trend = calculator.calculate(
            transactions = listOf(
                transaction("income", "100.00", "2023-12-02T00:00:00Z"),
                transaction("transfer_in", "25.00", "2023-12-03T00:00:00Z"),
                transaction("expense", "30.00", "2023-12-04T00:00:00Z"),
                transaction("transfer_out", "10.00", "2023-12-05T00:00:00Z"),
                transaction("transfer", "999.00", "2023-12-06T00:00:00Z"),
            ),
            currency = eur,
            now = Instant.parse("2024-02-15T00:00:00Z"),
        )

        assertThat(trend.map { it.period }).containsExactly("2023-12", "2024-01", "2024-02")
        assertThat(trend.map { it.balance.amount }).containsExactly(BigDecimal("85.00"), BigDecimal("85.00"), BigDecimal("85.00"))
    }

    @Test
    fun `assigns transactions to UTC months around year boundaries`() {
        val trend = calculator.calculate(
            transactions = listOf(transaction("income", "12.00", "2023-12-31T23:59:59Z")),
            currency = eur,
            now = Instant.parse("2024-01-01T00:00:00Z"),
        )

        assertThat(trend.map { it.period }).containsExactly("2023-12", "2024-01")
        assertThat(trend.map { it.balance.amount }).containsExactly(BigDecimal("12.00"), BigDecimal("12.00"))
    }

    @Test
    fun `returns the single relevant month`() {
        val trend = calculator.calculate(
            transactions = listOf(transaction("income", "12.00", "2026-09-15T00:00:00Z")),
            currency = eur,
            now = Instant.parse("2026-09-30T23:59:59Z"),
        )

        assertThat(trend).extracting<String> { it.period }.containsExactly("2026-09")
        assertThat(trend.single().balance.amount).isEqualByComparingTo("12.00")
    }

    @Test
    fun `keeps the established six zero points without relevant transactions`() {
        val trend = calculator.calculate(emptyList(), eur, Instant.parse("2026-09-15T00:00:00Z"))

        assertThat(trend).extracting<String> { it.period }.containsExactly("2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09")
        assertThat(trend).allMatch { it.balance.amount.compareTo(BigDecimal.ZERO) == 0 }
    }

    private fun transaction(type: String, amount: String, occurredAt: String) = NetWorthTransactionRead(
        accountId = accountId,
        type = type,
        status = "posted",
        amount = Money(BigDecimal(amount), "EUR"),
        occurredAt = Instant.parse(occurredAt),
    )
}
