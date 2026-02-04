package com.gonezo.presentation

import com.gonezo.domain.budgeting.ports.BudgetReservationRepository
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

@RestController
@RequestMapping("/budget-periods")
class ReservationQueryController(
  private val budgetReservationRepository: BudgetReservationRepository,
) {

  @GetMapping("/{periodId}/reservations")
  fun listActiveReservations(@PathVariable periodId: UUID): List<BudgetReservationResponse> {
    return budgetReservationRepository.listActiveByPeriod(periodId).map { res ->
      BudgetReservationResponse(
        id = res.id,
        budgetPeriodId = res.budgetPeriodId,
        patternId = res.patternId,
        categoryId = res.categoryId,
        amount = res.amount.amount,
        currency = res.amount.currency,
        status = res.status.value,
        expectedEffectiveDate = res.expectedEffectiveDate,
        linkedTransactionId = res.linkedTransactionId,
      )
    }
  }
}

data class BudgetReservationResponse(
  val id: UUID,
  val budgetPeriodId: UUID,
  val patternId: UUID,
  val categoryId: UUID,
  val amount: BigDecimal,
  val currency: String,
  val status: String,
  val expectedEffectiveDate: LocalDate,
  val linkedTransactionId: UUID?,
)
