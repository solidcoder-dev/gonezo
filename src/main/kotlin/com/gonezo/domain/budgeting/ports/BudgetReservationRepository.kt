package com.gonezo.domain.budgeting.ports

import com.gonezo.domain.budgeting.BudgetReservation
import java.util.UUID

interface BudgetReservationRepository {
  fun findByPeriodAndPattern(periodId: UUID, patternId: UUID): BudgetReservation?
  fun listActiveByPeriod(periodId: UUID): List<BudgetReservation>
  fun save(reservation: BudgetReservation)
}
