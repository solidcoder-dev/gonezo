package com.gonezo.application.query

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.recurrence.domain.SchedulingKind
import java.math.BigDecimal
import java.time.Instant

@JvmInline
value class AnalyticsFactId(val value: String) {
    init { require(value.isNotBlank()) { "analytics fact id is required" } }
}

sealed interface AnalyticsMovementReference {
    data class Posted(val transactionId: String) : AnalyticsMovementReference {
        init { require(transactionId.isNotBlank()) { "transaction id is required" } }
    }
    data class Expected(val expectedMovementId: String, val recurringMovementId: String?, val occurrenceId: String?) : AnalyticsMovementReference
    data class ScheduledProjection(val recurringMovementId: String, val occurrenceId: String) : AnalyticsMovementReference
}

data class AnalyticsExclusionKey(val scopeType: String, val scopeId: String)

fun interface AnalyticsExclusionReader {
    fun readIgnored(references: Collection<AnalyticsMovementReference>): Set<AnalyticsExclusionKey>
}

object AnalyticsExclusionKeyResolver {
    fun resolve(reference: AnalyticsMovementReference): AnalyticsExclusionKey? = when (reference) {
        is AnalyticsMovementReference.Posted -> AnalyticsExclusionKey("movement", reference.transactionId)
        is AnalyticsMovementReference.Expected -> AnalyticsExclusionKey("expected_movement", reference.expectedMovementId)
        is AnalyticsMovementReference.ScheduledProjection -> null
    }
}

enum class AnalyticsMovementSource { POSTED, EXPECTED, SCHEDULED_PROJECTION }
enum class AnalyticsMovementType { INCOME, EXPENSE, TRANSFER_IN, TRANSFER_OUT }

data class AnalyticsMovementIdentity(val value: String) {
    init { require(value.isNotBlank()) { "analytics movement identity is required" } }
    companion object {
        fun posted(transactionId: String) = stable("posted", transactionId)
        fun occurrence(originOccurrenceId: String) = stable("occurrence", originOccurrenceId)
        fun expected(expectedId: String, originOccurrenceId: String?, originRecurringMovementId: String?, resolvedTransactionId: String? = null) = when {
            !resolvedTransactionId.isNullOrBlank() -> posted(resolvedTransactionId)
            !originOccurrenceId.isNullOrBlank() -> stable("occurrence", originOccurrenceId)
            !originRecurringMovementId.isNullOrBlank() -> stable("expected-series", originRecurringMovementId, expectedId)
            else -> stable("expected", expectedId)
        }
        fun scheduled(originOccurrenceId: String) = occurrence(originOccurrenceId)
        @Deprecated("Scheduled projections must use the persisted occurrence id")
        fun scheduled(recurringMovementId: String, occurrenceNumber: Int) = stable("legacy-occurrence", recurringMovementId, occurrenceNumber.toString())
        private fun stable(kind: String, vararg parts: String) = AnalyticsMovementIdentity(listOf(kind, *parts).joinToString("/"))
    }
}

data class AnalyticsCategoryAllocation(val categoryId: String?, val personalAmount: Money, val fullAmount: Money)
data class AnalyticsSharingSummary(val participantCount: Int, val settlementParticipantCount: Int, val participantAllocatedAmount: Money, val settlementRequiredAmount: Money) {
    init {
        require(participantCount >= 0 && settlementParticipantCount in 0..participantCount)
        require(participantAllocatedAmount.currency == settlementRequiredAmount.currency)
        require(participantAllocatedAmount.amount >= BigDecimal.ZERO)
        require(settlementRequiredAmount.amount >= BigDecimal.ZERO)
        require(settlementRequiredAmount.amount <= participantAllocatedAmount.amount)
    }
}
data class AnalyticsSchedulingOrigin(val kind: SchedulingKind, val recurringMovementId: String, val occurrenceId: String? = null, val cadence: AnalyticsRecurrenceCadence? = null) {
    init { require(recurringMovementId.isNotBlank()); require(occurrenceId == null || occurrenceId.isNotBlank()) }
}
data class AnalyticsRecurrenceCadence(val frequency: String, val interval: Int) {
    init { require(frequency in setOf("daily", "weekly", "monthly", "yearly")); require(interval >= 1) }
}
data class AnalyticsCategoryAmount(val categoryId: String?, val amount: BigDecimal)

data class AnalyticsMovementFact(
    val identity: AnalyticsMovementIdentity,
    val source: AnalyticsMovementSource,
    val effectiveAt: Instant,
    val accountId: String,
    val type: AnalyticsMovementType,
    val currency: CurrencyCode,
    val personalAmount: Money,
    val fullAmount: Money,
    val ignored: Boolean,
    val categoryId: String?,
    val tagIds: Set<String>,
    val destinationAccountId: String? = null,
    val analyticsFactId: AnalyticsFactId = AnalyticsFactId(identity.value),
    val reference: AnalyticsMovementReference = AnalyticsMovementReference.ScheduledProjection("legacy", identity.value),
    val categoryAllocations: List<AnalyticsCategoryAllocation> = emptyList(),
    val schedulingOrigin: AnalyticsSchedulingOrigin? = null,
    val sharing: AnalyticsSharingSummary? = null,
    val merchant: AnalyticsMerchantReference? = null,
    val tags: List<AnalyticsTagReference> = emptyList(),
) {
    init {
        sharing?.let {
            require(type == AnalyticsMovementType.EXPENSE || type == AnalyticsMovementType.INCOME)
            require(it.participantAllocatedAmount.currency == currency.value && it.settlementRequiredAmount.currency == currency.value)
            require(it.participantAllocatedAmount.amount <= fullAmount.amount)
            require(personalAmount.amount == fullAmount.amount - it.settlementRequiredAmount.amount)
        }
    }
    val sourceAccountId: String get() = accountId
}

data class AnalyticsPostedMovement(val id: String, val effectiveAt: Instant, val accountId: String, val type: AnalyticsMovementType, val currency: CurrencyCode, val personalAmount: Money, val fullAmount: Money, val ignored: Boolean = false, val categoryId: String? = null, val tagIds: Set<String> = emptySet(), val occurrenceIdentity: AnalyticsMovementIdentity? = null, val destinationAccountId: String? = null, val splitAmounts: List<AnalyticsCategoryAmount> = emptyList(), val schedulingOrigin: AnalyticsSchedulingOrigin? = null, val sharing: AnalyticsSharingSummary? = null, val merchant: String? = null, val tags: List<AnalyticsTagReference> = emptyList())
data class AnalyticsExpectedMovement(val id: String, val effectiveAt: Instant, val accountId: String, val type: AnalyticsMovementType, val currency: CurrencyCode, val personalAmount: Money, val fullAmount: Money, val pending: Boolean, val ignored: Boolean = false, val categoryId: String? = null, val tagIds: Set<String> = emptySet(), val originOccurrenceId: String? = null, val originRecurringMovementId: String? = null, val resolvedTransactionId: String? = null, val destinationAccountId: String? = null, val schedulingOrigin: AnalyticsSchedulingOrigin? = null, val sharing: AnalyticsSharingSummary? = null, val merchant: String? = null, val tagNames: List<String> = emptyList(), val tags: List<AnalyticsTagReference> = emptyList())
data class AnalyticsScheduledProjection(val identity: AnalyticsMovementIdentity, val effectiveAt: Instant, val accountId: String, val type: AnalyticsMovementType, val currency: CurrencyCode, val personalAmount: Money, val fullAmount: Money, val ignored: Boolean = false, val categoryId: String? = null, val tagIds: Set<String> = emptySet(), val originOccurrenceId: String? = null, val recurringMovementId: String? = null, val destinationAccountId: String? = null, val schedulingOrigin: AnalyticsSchedulingOrigin? = null, val sharing: AnalyticsSharingSummary? = null, val merchant: String? = null, val tagNames: List<String> = emptyList(), val tags: List<AnalyticsTagReference> = emptyList())

data class AnalyticsMovementQueryFilters(val currency: CurrencyCode? = null, val accountIds: Set<String> = emptySet(), val types: Set<AnalyticsMovementType> = emptySet(), val categoryId: String? = null, val tagIds: Set<String> = emptySet(), val includeIgnoredMovements: Boolean = false, val useFullAmount: Boolean = false)
