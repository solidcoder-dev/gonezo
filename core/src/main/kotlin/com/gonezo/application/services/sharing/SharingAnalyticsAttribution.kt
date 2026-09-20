package com.gonezo.application.services.sharing

import com.gonezo.sharing.domain.AmountMovementShareAllocationStrategy
import com.gonezo.sharing.domain.CurrencyScaleResolver
import com.gonezo.sharing.domain.DefaultCurrencyScaleResolver
import com.gonezo.sharing.domain.MovementShare
import com.gonezo.sharing.domain.PartsMovementShareAllocationStrategy
import com.gonezo.sharing.domain.PlannedMovementShare
import com.gonezo.sharing.domain.RecurringShareAllocationMode
import com.gonezo.sharing.domain.RecurringSharePlan
import com.gonezo.sharing.domain.ShareSettlementStatus
import java.math.BigDecimal

data class SharingAnalyticsAttribution(val participantCount: Int, val settlementParticipantCount: Int, val participantAllocatedAmount: BigDecimal, val settlementRequiredAmount: BigDecimal) {
    init {
        require(participantCount >= 0)
        require(settlementParticipantCount in 0..participantCount)
        require(settlementRequiredAmount >= BigDecimal.ZERO)
        require(settlementRequiredAmount <= participantAllocatedAmount)
    }

    fun personalAmount(fullAmount: BigDecimal): BigDecimal {
        require(fullAmount >= participantAllocatedAmount)
        return fullAmount - settlementRequiredAmount
    }
}

class SharingAnalyticsAttributionResolver(private val currencyScaleResolver: CurrencyScaleResolver = DefaultCurrencyScaleResolver) {
    fun posted(share: MovementShare): SharingAnalyticsAttribution = attribution(
        allocations = share.participants.map { it.amount to (it.settlementStatus != ShareSettlementStatus.NOT_REQUIRED) },
    )

    fun expected(share: PlannedMovementShare): SharingAnalyticsAttribution = attribution(
        allocations = share.participants.map { it.amount to it.reimbursable },
    )

    fun scheduled(plan: RecurringSharePlan, fullAmount: BigDecimal): SharingAnalyticsAttribution {
        val scale = currencyScaleResolver.scale(plan.currency)
        val amounts = when (plan.mode) {
            RecurringShareAllocationMode.PARTS -> PartsMovementShareAllocationStrategy().allocate(fullAmount, plan, scale)
            RecurringShareAllocationMode.AMOUNTS -> AmountMovementShareAllocationStrategy().allocate(fullAmount, plan, scale)
        }
        val participants = plan.participants.sortedBy { it.order }
        return attribution(participants.zip(amounts).map { (participant, amount) -> amount to participant.reimbursable })
    }

    private fun attribution(allocations: List<Pair<BigDecimal, Boolean>>): SharingAnalyticsAttribution = SharingAnalyticsAttribution(
        participantCount = allocations.size,
        settlementParticipantCount = allocations.count { (amount, requiresSettlement) -> requiresSettlement && amount > BigDecimal.ZERO },
        participantAllocatedAmount = allocations.fold(BigDecimal.ZERO) { total, (amount, _) -> total + amount },
        settlementRequiredAmount = allocations.fold(BigDecimal.ZERO) { total, (amount, requiresSettlement) ->
            if (requiresSettlement) total + amount else total
        },
    )
}
