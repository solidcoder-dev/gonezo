package com.gonezo.application.services

import com.gonezo.application.CreateBudgetPeriodCommand
import com.gonezo.application.CreateBudgetPeriodUC
import com.gonezo.application.CreatePeriodReservationsCommand
import com.gonezo.application.CreatePeriodReservationsUC
import com.gonezo.application.events.DomainEventPublisher
import com.gonezo.domain.budgeting.BudgetPeriod
import com.gonezo.domain.budgeting.events.BudgetPeriodCreated
import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import com.gonezo.domain.budgeting.ports.BudgetPlanRepository
import com.gonezo.domain.shared.Money
import com.gonezo.domain.shared.YearMonth
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

@Service
class CreateBudgetPeriodService(
  private val budgetPlanRepository: BudgetPlanRepository,
  private val budgetPeriodRepository: BudgetPeriodRepository,
  private val createPeriodReservationsUC: CreatePeriodReservationsUC,
  private val domainEventPublisher: DomainEventPublisher,
) : CreateBudgetPeriodUC {

  @Transactional
  override fun execute(command: CreateBudgetPeriodCommand): UUID {
    val plan = budgetPlanRepository.get(command.planId)
    val zero = Money(BigDecimal.ZERO, command.currency)

    val period = BudgetPeriod(
      id = UUID.randomUUID(),
      budgetPlanId = plan.id,
      yearMonth = YearMonth(command.year, command.month),
      incomeTotal = zero,
      remainder = zero,
    )

    budgetPeriodRepository.save(period)
    domainEventPublisher.publish(
      BudgetPeriodCreated(
        budgetPeriodId = period.id,
        yearMonth = period.yearMonth,
      ),
    )

    if (plan.reservationPolicy == com.gonezo.domain.budgeting.ReservationPolicy.RESERVE_START_OF_PERIOD) {
      createPeriodReservationsUC.execute(CreatePeriodReservationsCommand(period.id))
    }
    return period.id
  }
}
