package com.gonezo.domain.budgeting.ports

import com.gonezo.domain.budgeting.BudgetReservation
import java.util.UUID

interface BudgetReservationRepository {
  fun get(id: UUID): BudgetReservation
  fun findByPeriodAndPattern(periodId: UUID, patternId: UUID): BudgetReservation?
  fun listActiveByPeriod(periodId: UUID): List<BudgetReservation>
  fun save(reservation: BudgetReservation)
}
