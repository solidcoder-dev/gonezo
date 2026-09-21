package com.gonezo.application.query

import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import java.time.Instant
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class AnalyticsAccountBalanceCoverageQueryTest {
    @Test
    fun `returns only the earliest account local date`() {
        val later = account("00000000-0000-4000-8000-000000000001", "2026-01-02T00:30:00Z")
        val earlier = account("00000000-0000-4000-8000-000000000002", "2025-12-31T23:30:00Z")

        val result = AnalyticsAccountBalanceCoverageQuery().execute(listOf(later, earlier), "Europe/Madrid")

        assertThat(result.firstAccountLocalDate).isEqualTo("2026-01-01")
        assertThat(result.toString()).doesNotContain(later.id.toString(), earlier.id.toString(), later.name, earlier.name)
    }

    @Test
    fun `returns no date when no accounts exist`() {
        assertThat(AnalyticsAccountBalanceCoverageQuery().execute(emptyList(), "UTC").firstAccountLocalDate).isNull()
    }

    private fun account(id: String, createdAt: String): Account = Account.open(
        id = AccountId.from(id),
        name = id,
        type = AccountType.BANK,
        currency = CurrencyCode.from("EUR"),
        createdAt = Instant.parse(createdAt),
    )
}
