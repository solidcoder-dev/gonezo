package com.gonezo.application.services

import com.gonezo.domain.budgeting.ports.BudgetPlanRepository
import org.springframework.stereotype.Service
import java.time.LocalDate
import java.util.UUID

@Service
class BudgetAttributionService(
  private val budgetPlanRepository: BudgetPlanRepository,
) {

  fun resolveDate(planId: UUID, postedDate: LocalDate, effectiveDate: LocalDate): LocalDate {
    val plan = budgetPlanRepository.get(planId)
    return if (plan.effectiveDatingPolicy == com.gonezo.domain.budgeting.EffectiveDatingPolicy.USE_POSTED_DATE) {
      postedDate
    } else {
      effectiveDate
    }
  }
}
