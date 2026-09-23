package com.gonezo.application.query

import java.text.Normalizer
import java.util.Locale

data class AnalyticsMerchantReference(val key: String, val displayName: String) {
    init {
        require(key.isNotBlank() && displayName.isNotBlank()) { "merchant reference values are required" }
    }
}

data class AnalyticsTagReference(val key: String, val tagId: String?, val displayName: String) {
    init {
        require(key.isNotBlank() && displayName.isNotBlank()) { "tag reference values are required" }
    }
}

object AnalyticsTagReferenceResolver {
    fun resolve(tagIds: Collection<String>, tagNames: List<String>, displayNamesById: Map<String, String>, idsByNormalizedName: Map<String, String>, normalizeName: (String) -> String): List<AnalyticsTagReference> {
        val persistedIds = tagIds.map(String::trim).filter(String::isNotBlank).distinct()
        val referencesById = persistedIds.mapNotNull { id -> displayNamesById[id]?.trim()?.takeIf(String::isNotEmpty)?.let { AnalyticsTagReference("tag:$id", id, it) } }
        val references = if (referencesById.isNotEmpty()) {
            referencesById
        } else {
            tagNames.mapNotNull { rawName ->
                val displayName = rawName.trim().takeIf(String::isNotEmpty) ?: return@mapNotNull null
                val normalizedName = normalizeName(displayName)
                val tagId = idsByNormalizedName[normalizedName]
                if (tagId == null) {
                    AnalyticsTagReference("name:$normalizedName", null, displayName)
                } else {
                    AnalyticsTagReference("tag:$tagId", tagId, displayNamesById[tagId]?.trim()?.takeIf(String::isNotEmpty) ?: displayName)
                }
            }
        }
        return references.distinctBy(AnalyticsTagReference::key).sortedBy(AnalyticsTagReference::key)
    }
}

object AnalyticsMerchantReferenceResolver {
    fun resolve(merchant: String?, type: AnalyticsMovementType): AnalyticsMerchantReference? {
        if (type == AnalyticsMovementType.TRANSFER_IN || type == AnalyticsMovementType.TRANSFER_OUT) return null
        val displayName = merchant?.trim { it.isWhitespace() || Character.isSpaceChar(it) || it == '\uFEFF' }
            ?.replace(Regex("[\\s\\p{Z}\\uFEFF]+"), " ")?.takeIf(String::isNotEmpty) ?: return null
        val key = Normalizer.normalize(displayName, Normalizer.Form.NFD).replace(Regex("\\p{M}+"), "").lowercase(Locale.ROOT)
        return AnalyticsMerchantReference(key, displayName)
    }
}

object AnalyticsCategoryAllocationResolver {
    fun resolve(categoryId: String?, personalAmount: com.gonezo.domain.shared.Money, fullAmount: com.gonezo.domain.shared.Money, splitAmounts: List<AnalyticsCategoryAmount> = emptyList()): List<AnalyticsCategoryAllocation> {
        require(personalAmount.currency == fullAmount.currency) { "category allocation currencies must match" }
        val full = fullAmount.amount
        val personal = personalAmount.amount
        require(full >= java.math.BigDecimal.ZERO && personal >= java.math.BigDecimal.ZERO) { "category allocation amounts cannot be negative" }
        val amounts = if (splitAmounts.isEmpty()) {
            listOf(AnalyticsCategoryAmount(categoryId, full))
        } else {
            val splitTotal = splitAmounts.fold(java.math.BigDecimal.ZERO) { total, item -> total + item.amount }
            require(splitAmounts.all { it.amount >= java.math.BigDecimal.ZERO }) { "split allocation amounts cannot be negative" }
            require(splitTotal <= full) { "split allocation total exceeds movement amount" }
            splitAmounts + if (splitTotal < full) listOf(AnalyticsCategoryAmount(null, full - splitTotal)) else emptyList()
        }
        var allocatedPersonal = java.math.BigDecimal.ZERO
        return amounts.mapIndexed { index, allocation ->
            val personalSlice = when {
                index == amounts.lastIndex -> personal - allocatedPersonal
                full.compareTo(java.math.BigDecimal.ZERO) == 0 -> java.math.BigDecimal.ZERO
                else -> allocation.amount.multiply(personal).divide(full, personal.scale().coerceAtLeast(0), java.math.RoundingMode.HALF_UP)
            }
            allocatedPersonal += personalSlice
            AnalyticsCategoryAllocation(allocation.categoryId, com.gonezo.domain.shared.Money(personalSlice, personalAmount.currency), com.gonezo.domain.shared.Money(allocation.amount, fullAmount.currency))
        }
    }
}

object AnalyticsOccurrenceIdentityResolver {
    fun posted(transaction: AnalyticsPostedMovement): AnalyticsMovementIdentity = transaction.occurrenceIdentity ?: AnalyticsMovementIdentity.posted(transaction.id)

    fun expected(movement: AnalyticsExpectedMovement): AnalyticsMovementIdentity = AnalyticsMovementIdentity.expected(
        movement.id,
        movement.originOccurrenceId,
        movement.originRecurringMovementId,
        movement.resolvedTransactionId,
    )

    fun scheduled(projection: AnalyticsScheduledProjection): AnalyticsMovementIdentity = projection.originOccurrenceId?.let(AnalyticsMovementIdentity::scheduled) ?: projection.identity
}
