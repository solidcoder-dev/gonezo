package com.gonezo.presentation

import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.util.UUID

@RestController
@RequestMapping("/budget-periods")
class BudgetPeriodQueryController(
  private val budgetPeriodRepository: BudgetPeriodRepository,
) {

  @GetMapping("/{periodId}")
  fun getPeriod(@PathVariable periodId: UUID): BudgetPeriodResponse {
    val period = budgetPeriodRepository.get(periodId)
    return BudgetPeriodResponse(
      id = period.id,
      budgetPlanId = period.budgetPlanId,
      year = period.yearMonth.year,
      month = period.yearMonth.month,
      incomeTotalAmount = period.incomeTotal.amount,
      incomeTotalCurrency = period.incomeTotal.currency,
      remainderAmount = period.remainder.amount,
      remainderCurrency = period.remainder.currency,
    )
  }
}

data class BudgetPeriodResponse(
  val id: UUID,
  val budgetPlanId: UUID,
  val year: Int,
  val month: Int,
  val incomeTotalAmount: BigDecimal,
  val incomeTotalCurrency: String,
  val remainderAmount: BigDecimal,
  val remainderCurrency: String,
)
