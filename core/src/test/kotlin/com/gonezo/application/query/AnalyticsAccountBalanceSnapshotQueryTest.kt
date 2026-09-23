package com.gonezo.application.query

import com.gonezo.domain.shared.Money
import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.ledger.domain.Transaction
import com.gonezo.ledger.domain.TransactionId
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class AnalyticsAccountBalanceSnapshotQueryTest {
    @Test
    fun `snapshot applies local exclusive cutoff and includes archived and zero accounts`() {
        val before = account("00000000-0000-4000-8000-000000000001", AccountType.BANK, "2026-09-01T00:00:00Z")
        val archived = account("00000000-0000-4000-8000-000000000002", AccountType.CARD, "2026-09-01T00:00:00Z")
            .copy(status = com.gonezo.ledger.domain.AccountStatus.ARCHIVED)
        val atCutoff = account("00000000-0000-4000-8000-000000000003", AccountType.CASH, "2026-09-01T22:00:00Z")
        val posted = Transaction.recordIncome(
            id = TransactionId.from("00000000-0000-4000-8000-000000000011"),
            accountId = before.id,
            amount = Money(BigDecimal("10.005"), "EUR"),
            occurredAt = Instant.parse("2026-09-01T21:59:59Z"),
            description = null,
            merchant = null,
        )
        val atCutoffTransaction = Transaction.recordIncome(
            id = TransactionId.from("00000000-0000-4000-8000-000000000012"),
            accountId = before.id,
            amount = Money(BigDecimal("100"), "EUR"),
            occurredAt = Instant.parse("2026-09-01T22:00:00Z"),
            description = null,
            merchant = null,
        )
        val draft = Transaction.createExpenseDraft(
            id = TransactionId.from("00000000-0000-4000-8000-000000000013"),
            accountId = before.id,
            amount = Money(BigDecimal("500"), "EUR"),
            occurredAt = Instant.parse("2026-09-01T21:00:00Z"),
            description = null,
            merchant = null,
        )

        val result = AnalyticsAccountBalanceSnapshotQuery().execute(
            accounts = listOf(before, archived, atCutoff),
            transactions = listOf(posted, atCutoffTransaction, draft),
            input = AnalyticsAccountBalanceSnapshotInput("2026-09-02", "Europe/Madrid"),
        )

        assertThat(result.items).containsExactly(
            AnalyticsAccountBalanceSnapshotItem(before.id.toString(), "bank", "EUR", "10.005"),
            AnalyticsAccountBalanceSnapshotItem(archived.id.toString(), "card", "EUR", "0"),
        )
    }

    private fun account(id: String, type: AccountType, createdAt: String): Account = Account.open(
        id = AccountId.from(id),
        name = id,
        type = type,
        currency = CurrencyCode.from("EUR"),
        createdAt = Instant.parse(createdAt),
    )
}
