package com.gonezo.application.query

class AnalyticsMovementFactAssembler {
    fun assemble(posted: Iterable<AnalyticsPostedMovement>, expected: Iterable<AnalyticsExpectedMovement>, scheduled: Iterable<AnalyticsScheduledProjection>, includePlannedMovements: Boolean, exclusionReader: AnalyticsExclusionReader? = null): List<AnalyticsMovementFact> {
        val postedFacts = posted.map { movement -> fact(movement, AnalyticsMovementSource.POSTED, AnalyticsOccurrenceIdentityResolver.posted(movement), AnalyticsMovementReference.Posted(movement.id), movement.schedulingOrigin, movement.splitAmounts) }
        if (!includePlannedMovements) return resolveIgnored(postedFacts, exclusionReader)
        val expectedFacts = expected.asSequence().filter { it.pending }.map { movement -> fact(movement, AnalyticsMovementSource.EXPECTED, AnalyticsOccurrenceIdentityResolver.expected(movement), AnalyticsMovementReference.Expected(movement.id, movement.originRecurringMovementId, movement.originOccurrenceId), movement.schedulingOrigin) }.toList()
        val scheduledFacts = scheduled.map { movement -> fact(movement, AnalyticsMovementSource.SCHEDULED_PROJECTION, AnalyticsOccurrenceIdentityResolver.scheduled(movement), AnalyticsMovementReference.ScheduledProjection(movement.recurringMovementId ?: "legacy", movement.originOccurrenceId ?: movement.identity.value), movement.schedulingOrigin) }
        return resolveIgnored(postedFacts + expectedFacts + scheduledFacts, exclusionReader)
    }

    private fun fact(movement: AnalyticsPostedMovement, source: AnalyticsMovementSource, identity: AnalyticsMovementIdentity, reference: AnalyticsMovementReference, schedulingOrigin: AnalyticsSchedulingOrigin?, splitAmounts: List<AnalyticsCategoryAmount>): AnalyticsMovementFact = AnalyticsMovementFact(identity, source, movement.effectiveAt, movement.accountId, movement.type, movement.currency, movement.personalAmount, movement.fullAmount, movement.ignored, movement.categoryId, movement.tagIds + movement.tags.mapNotNull { it.tagId }, movement.destinationAccountId, AnalyticsFactId(identity.value), reference, allocations(movement.type, movement.categoryId, movement.personalAmount, movement.fullAmount, splitAmounts), schedulingOrigin, movement.sharing, AnalyticsMerchantReferenceResolver.resolve(movement.merchant, movement.type), movement.tags)

    private fun fact(movement: AnalyticsExpectedMovement, source: AnalyticsMovementSource, identity: AnalyticsMovementIdentity, reference: AnalyticsMovementReference, schedulingOrigin: AnalyticsSchedulingOrigin?): AnalyticsMovementFact = AnalyticsMovementFact(identity, source, movement.effectiveAt, movement.accountId, movement.type, movement.currency, movement.personalAmount, movement.fullAmount, movement.ignored, movement.categoryId, movement.tagIds + movement.tags.mapNotNull { it.tagId }, movement.destinationAccountId, AnalyticsFactId(identity.value), reference, allocations(movement.type, movement.categoryId, movement.personalAmount, movement.fullAmount), schedulingOrigin, movement.sharing, AnalyticsMerchantReferenceResolver.resolve(movement.merchant, movement.type), movement.tags)

    private fun fact(movement: AnalyticsScheduledProjection, source: AnalyticsMovementSource, identity: AnalyticsMovementIdentity, reference: AnalyticsMovementReference, schedulingOrigin: AnalyticsSchedulingOrigin?): AnalyticsMovementFact = AnalyticsMovementFact(identity, source, movement.effectiveAt, movement.accountId, movement.type, movement.currency, movement.personalAmount, movement.fullAmount, movement.ignored, movement.categoryId, movement.tagIds + movement.tags.mapNotNull { it.tagId }, movement.destinationAccountId, AnalyticsFactId(identity.value), reference, allocations(movement.type, movement.categoryId, movement.personalAmount, movement.fullAmount), schedulingOrigin, movement.sharing, AnalyticsMerchantReferenceResolver.resolve(movement.merchant, movement.type), movement.tags)

    private fun resolveIgnored(facts: List<AnalyticsMovementFact>, exclusionReader: AnalyticsExclusionReader?): List<AnalyticsMovementFact> {
        val resolvedFacts = exclusionReader?.let { reader ->
            val ignoredKeys = reader.readIgnored(facts.map(AnalyticsMovementFact::reference))
            facts.map { fact -> fact.copy(ignored = AnalyticsExclusionKeyResolver.resolve(fact.reference)?.let(ignoredKeys::contains) ?: false) }
        } ?: facts
        return AnalyticsMovementDeduplicator.select(resolvedFacts)
    }

    private fun allocations(type: AnalyticsMovementType, categoryId: String?, personalAmount: com.gonezo.domain.shared.Money, fullAmount: com.gonezo.domain.shared.Money, splitAmounts: List<AnalyticsCategoryAmount> = emptyList()): List<AnalyticsCategoryAllocation> = when (type) {
        AnalyticsMovementType.INCOME, AnalyticsMovementType.EXPENSE -> AnalyticsCategoryAllocationResolver.resolve(categoryId, personalAmount, fullAmount, splitAmounts)
        AnalyticsMovementType.TRANSFER_IN, AnalyticsMovementType.TRANSFER_OUT -> emptyList()
    }
}

class AnalyticsMovementFactQueryService(private val assembler: AnalyticsMovementFactAssembler = AnalyticsMovementFactAssembler(), private val exclusionReader: AnalyticsExclusionReader? = null) {
    fun query(posted: Iterable<AnalyticsPostedMovement>, expected: Iterable<AnalyticsExpectedMovement>, scheduled: Iterable<AnalyticsScheduledProjection>, filters: AnalyticsMovementQueryFilters = AnalyticsMovementQueryFilters(), includePlannedMovements: Boolean = true): List<AnalyticsMovementFact> = assembler.assemble(posted, expected, scheduled, includePlannedMovements, exclusionReader).asSequence()
        .filter { filters.currency == null || it.currency == filters.currency }
        .filter { filters.accountIds.isEmpty() || it.accountId in filters.accountIds }
        .filter { filters.types.isEmpty() || it.type in filters.types }
        .filter { filters.categoryId == null || it.categoryId == filters.categoryId }
        .filter { filters.tagIds.isEmpty() || it.tagIds.any(filters.tagIds::contains) }
        .filter { filters.includeIgnoredMovements || !it.ignored }
        .toList()
}
