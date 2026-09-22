package com.gonezo.application.query

object AnalyticsMovementDeduplicator {
    fun select(facts: Iterable<AnalyticsMovementFact>): List<AnalyticsMovementFact> = facts
        .groupBy(AnalyticsMovementFact::identity)
        .values
        .map { candidates -> candidates.maxWith(priorityComparator) }
        .sortedWith(compareBy<AnalyticsMovementFact> { it.effectiveAt }.thenBy { it.identity.value })

    private val priorityComparator = compareBy<AnalyticsMovementFact> { sourcePriority(it.source) }
        .thenByDescending { it.effectiveAt }
        .thenBy { it.identity.value }

    private fun sourcePriority(source: AnalyticsMovementSource): Int = when (source) {
        AnalyticsMovementSource.POSTED -> 3
        AnalyticsMovementSource.EXPECTED -> 2
        AnalyticsMovementSource.SCHEDULED_PROJECTION -> 1
    }
}
