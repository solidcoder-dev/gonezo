package com.gonezo.application.services

import com.gonezo.application.AllocateBudgetCommand
import com.gonezo.application.AllocateBudgetUC
import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.domain.budgeting.events.BudgetAllocated
import com.gonezo.domain.budgeting.ports.AllocationRuleRepository
import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import com.gonezo.domain.budgeting.ports.CategoryBalanceRepository
import com.gonezo.domain.budgeting.ports.CategoryRepository
import com.gonezo.domain.budgeting.services.BudgetAllocatorService
import com.gonezo.application.PolicyViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal

@Service
class AllocateBudgetService(
  private val budgetAllocatorService: BudgetAllocatorService,
  private val allocationRuleRepository: AllocationRuleRepository,
  private val budgetPeriodRepository: BudgetPeriodRepository,
  private val categoryRepository: CategoryRepository,
  private val categoryBalanceRepository: CategoryBalanceRepository,
  private val domainEventPublisher: DomainEventPublisher,
) : AllocateBudgetUC {

  @Transactional
  override fun execute(command: AllocateBudgetCommand) {
    val period = budgetPeriodRepository.get(command.periodId)
    val rules = allocationRuleRepository.listByPlan(period.budgetPlanId)
    val categories = categoryRepository.listByPlan(period.budgetPlanId)

    val totalPercent = rules.fold(BigDecimal.ZERO) { acc, rule -> acc + rule.percentOfRemainder.value }
    if (totalPercent.compareTo(BigDecimal.ONE) != 0) {
      throw PolicyViolationException("Allocation rules must sum to 1.0.")
    }

    val balances = budgetAllocatorService.allocate(period, rules, categories)
    balances.forEach { categoryBalanceRepository.save(it) }
    domainEventPublisher.publish(BudgetAllocated(period.id))
  }
}
