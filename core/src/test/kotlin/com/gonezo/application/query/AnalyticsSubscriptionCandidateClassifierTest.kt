package com.gonezo.application.query

import com.gonezo.domain.shared.Money
import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.recurrence.domain.SchedulingKind
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class AnalyticsSubscriptionCandidateClassifierTest {
    @Test
    fun `classification matches the TypeScript contract cases`() {
        assertThat(classify("monthly", 1)).isEqualTo(AnalyticsSubscriptionCandidateStatus.CANDIDATE)
        assertThat(classify("weekly", 2)).isEqualTo(AnalyticsSubscriptionCandidateStatus.CANDIDATE)
        assertThat(classify("yearly", 5)).isEqualTo(AnalyticsSubscriptionCandidateStatus.CANDIDATE)
        assertThat(classify("daily", 1)).isEqualTo(AnalyticsSubscriptionCandidateStatus.NOT_CANDIDATE)
        assertThat(classify("monthly", 1, merchant = null)).isEqualTo(AnalyticsSubscriptionCandidateStatus.NOT_CANDIDATE)
        assertThat(classify(null)).isEqualTo(AnalyticsSubscriptionCandidateStatus.UNKNOWN)
        assertThat(fact(type = AnalyticsMovementType.INCOME).subscriptionCandidateStatus).isNull()
        assertThat(fact(type = AnalyticsMovementType.TRANSFER_IN).subscriptionCandidateStatus).isNull()
        assertThat(fact(origin = null).subscriptionCandidateStatus).isNull()
        assertThat(fact(origin = AnalyticsSchedulingOrigin(SchedulingKind.ONE_SHOT, "private-series")).subscriptionCandidateStatus).isNull()
    }

    @Test
    fun `historical status follows captured cadence and not the current plan`() {
        val historical = fact(cadenceFrequency = "monthly").subscriptionCandidateStatus
        val future = fact(cadenceFrequency = "daily").subscriptionCandidateStatus

        assertThat(historical).isEqualTo(AnalyticsSubscriptionCandidateStatus.CANDIDATE)
        assertThat(future).isEqualTo(AnalyticsSubscriptionCandidateStatus.NOT_CANDIDATE)
    }

    @Test
    fun `lifecycle deduplication selects one candidate classification`() {
        val identity = AnalyticsMovementIdentity.occurrence("same-occurrence")
        val facts = listOf(
            fact(source = AnalyticsMovementSource.SCHEDULED_PROJECTION, identity = identity),
            fact(source = AnalyticsMovementSource.EXPECTED, identity = identity),
            fact(source = AnalyticsMovementSource.POSTED, identity = identity),
        )

        val selected = AnalyticsMovementDeduplicator.select(facts)

        assertThat(selected).hasSize(1)
        assertThat(selected.single().source).isEqualTo(AnalyticsMovementSource.POSTED)
        assertThat(selected.single().subscriptionCandidateStatus).isEqualTo(AnalyticsSubscriptionCandidateStatus.CANDIDATE)
    }

    private fun classify(frequency: String?, interval: Int = 1, merchant: AnalyticsMerchantReference? = merchant()) =
        fact(cadenceFrequency = frequency, cadenceInterval = interval, merchant = merchant).subscriptionCandidateStatus

    private fun fact(
        cadenceFrequency: String? = "monthly",
        cadenceInterval: Int = 1,
        merchant: AnalyticsMerchantReference? = merchant(),
        source: AnalyticsMovementSource = AnalyticsMovementSource.POSTED,
        identity: AnalyticsMovementIdentity = AnalyticsMovementIdentity("occurrence/private"),
        type: AnalyticsMovementType = AnalyticsMovementType.EXPENSE,
        origin: AnalyticsSchedulingOrigin? = AnalyticsSchedulingOrigin(
            SchedulingKind.RECURRING,
            "private-series",
            "private-occurrence",
            cadenceFrequency?.let { AnalyticsRecurrenceCadence(it, cadenceInterval) },
        ),
    ) = AnalyticsMovementFact(
        identity = identity,
        source = source,
        effectiveAt = Instant.parse("2026-09-01T00:00:00Z"),
        accountId = "account",
        type = type,
        currency = CurrencyCode.from("EUR"),
        personalAmount = Money.of(BigDecimal.ZERO, "EUR"),
        fullAmount = Money.of(BigDecimal("1"), "EUR"),
        ignored = false,
        categoryId = null,
        tagIds = emptySet(),
        schedulingOrigin = origin,
        merchant = merchant,
    )

    private fun merchant() = AnalyticsMerchantReference("merchant-private", "Merchant")
}
