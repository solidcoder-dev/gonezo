package com.gonezo.application.services

import com.gonezo.application.AllocateBudgetCommand
import com.gonezo.application.AllocateBudgetUC
import com.gonezo.domain.budgeting.ports.AllocationRuleRepository
import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import com.gonezo.domain.budgeting.ports.CategoryBalanceRepository
import com.gonezo.domain.budgeting.ports.CategoryRepository
import com.gonezo.domain.budgeting.services.BudgetAllocatorService
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AllocateBudgetService(
  private val budgetAllocatorService: BudgetAllocatorService,
  private val allocationRuleRepository: AllocationRuleRepository,
  private val budgetPeriodRepository: BudgetPeriodRepository,
  private val categoryRepository: CategoryRepository,
  private val categoryBalanceRepository: CategoryBalanceRepository,
) : AllocateBudgetUC {

  @Transactional
  override fun execute(command: AllocateBudgetCommand) {
    val period = budgetPeriodRepository.get(command.periodId)
    val rules = allocationRuleRepository.listByPlan(period.budgetPlanId)
    val categories = categoryRepository.listByPlan(period.budgetPlanId)

    val balances = budgetAllocatorService.allocate(period, rules, categories)
    balances.forEach { categoryBalanceRepository.save(it) }
  }
}
