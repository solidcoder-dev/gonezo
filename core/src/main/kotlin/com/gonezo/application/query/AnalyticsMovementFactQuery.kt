package com.gonezo.application.query

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import java.math.BigDecimal
import java.time.Instant

data class AnalyticsMovementReadWindow(val fromInclusive: Instant, val toExclusive: Instant) {
    init {
        require(fromInclusive < toExclusive) { "analytics window must be non-empty" }
    }

    fun contains(value: Instant): Boolean = !value.isBefore(fromInclusive) && value.isBefore(toExclusive)
}

interface AnalyticsPostedMovementReader {
    fun read(window: AnalyticsMovementReadWindow): Iterable<AnalyticsPostedMovement>
}

interface AnalyticsExpectedMovementReader {
    fun readPending(window: AnalyticsMovementReadWindow): Iterable<AnalyticsExpectedMovement>
}

interface AnalyticsScheduledMovementReader {
    fun read(window: AnalyticsMovementReadWindow): Iterable<AnalyticsScheduledProjection>
}

object AnalyticsAmountResolver {
    fun resolve(fact: AnalyticsMovementFact, useFullAmount: Boolean): Money = if (useFullAmount) fact.fullAmount else fact.personalAmount
}

data class AnalyticsFinancialTotals(val income: Money, val expenses: Money, val netFlow: Money)

data class AnalyticsMovementReadResult(val window: AnalyticsMovementReadWindow, val facts: List<AnalyticsMovementFact>, val totals: AnalyticsFinancialTotals)

class AnalyticsMovementFactQuery(private val postedReader: AnalyticsPostedMovementReader, private val expectedReader: AnalyticsExpectedMovementReader, private val scheduledReader: AnalyticsScheduledMovementReader, private val factQuery: AnalyticsMovementFactQueryService = AnalyticsMovementFactQueryService()) {
    fun execute(window: AnalyticsMovementReadWindow, filters: AnalyticsMovementQueryFilters = AnalyticsMovementQueryFilters(), includePlannedMovements: Boolean = true): AnalyticsMovementReadResult {
        val facts =
            factQuery
                .query(
                    posted = postedReader.read(window),
                    expected = if (includePlannedMovements) expectedReader.readPending(window) else emptyList(),
                    scheduled = if (includePlannedMovements) scheduledReader.read(window) else emptyList(),
                    filters = filters,
                    includePlannedMovements = includePlannedMovements,
                ).filter { window.contains(it.effectiveAt) }
        return AnalyticsMovementReadResult(window, facts, totals(facts, filters.useFullAmount))
    }

    private fun totals(facts: List<AnalyticsMovementFact>, useFullAmount: Boolean): AnalyticsFinancialTotals {
        val currency = facts.firstOrNull()?.currency ?: CurrencyCode.from("EUR")
        var income = BigDecimal.ZERO
        var expenses = BigDecimal.ZERO
        facts.forEach { fact ->
            val amount = AnalyticsAmountResolver.resolve(fact, useFullAmount).amount
            when (fact.type) {
                AnalyticsMovementType.INCOME, AnalyticsMovementType.TRANSFER_IN -> income += amount
                AnalyticsMovementType.EXPENSE, AnalyticsMovementType.TRANSFER_OUT -> expenses += amount
            }
        }
        return AnalyticsFinancialTotals(
            income = Money(income, currency.value),
            expenses = Money(expenses, currency.value),
            netFlow = Money(income - expenses, currency.value),
        )
    }
}
