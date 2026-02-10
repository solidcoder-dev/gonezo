package com.gonezo.application.services

import com.gonezo.domain.budgeting.BudgetReservation
import com.gonezo.domain.budgeting.RecurringPattern
import com.gonezo.domain.budgeting.ports.BudgetPeriodRepository
import com.gonezo.domain.budgeting.ports.BudgetReservationRepository
import com.gonezo.domain.budgeting.ports.RecurringPatternRepository
import com.gonezo.domain.shared.Money
import com.gonezo.domain.shared.YearMonth
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.util.UUID
import kotlin.math.abs

@Service
class ReservationMatchingService(
  private val budgetPeriodRepository: BudgetPeriodRepository,
  private val budgetReservationRepository: BudgetReservationRepository,
  private val recurringPatternRepository: RecurringPatternRepository,
) {

  fun findMatch(
    planId: UUID,
    date: LocalDate,
    categoryId: UUID,
    merchant: String?,
    amount: Money,
  ): BudgetReservation? {
    val merchantValue = merchant?.trim().orEmpty()
    if (merchantValue.isEmpty()) return null

    val period = try {
      budgetPeriodRepository.getByYearMonth(planId, YearMonth(date.year, date.monthValue))
    } catch (ex: Exception) {
      return null
    }
    val reservations = budgetReservationRepository.listActiveByPeriod(period.id)
      .filter { it.categoryId == categoryId }

    if (reservations.isEmpty()) return null

    val patterns = recurringPatternRepository.listActiveByPlan(planId).associateBy { it.id }

    val matches = reservations.mapNotNull { reservation ->
      val pattern = patterns[reservation.patternId] ?: return@mapNotNull null
      if (!merchantMatches(pattern, merchantValue)) return@mapNotNull null
      if (!amountMatches(pattern, amount)) return@mapNotNull null
      Candidate(reservation, pattern, amountDifference(pattern, amount))
    }

    return matches
      .sortedWith(compareBy<Candidate> { it.amountDiff }.thenBy { it.reservation.expectedEffectiveDate })
      .firstOrNull()
      ?.reservation
  }

  private fun merchantMatches(pattern: RecurringPattern, merchant: String): Boolean {
    val matcher = pattern.merchantMatcher.trim()
    if (matcher.isEmpty()) return false
    return if (matcher.startsWith("regex:", ignoreCase = true)) {
      val regex = Regex(matcher.removePrefix("regex:"), RegexOption.IGNORE_CASE)
      regex.containsMatchIn(merchant)
    } else {
      merchant.contains(matcher, ignoreCase = true)
    }
  }

  private fun amountMatches(pattern: RecurringPattern, amount: Money): Boolean {
    if (pattern.expectedAmount.currency != amount.currency) return false
    if (pattern.tolerance.currency != amount.currency) return false
    val diff = amountDifference(pattern, amount)
    return diff <= pattern.tolerance.amount.abs()
  }

  private fun amountDifference(pattern: RecurringPattern, amount: Money): BigDecimal {
    val diff = amount.amount.subtract(pattern.expectedAmount.amount)
    return diff.abs().setScale(2, RoundingMode.HALF_UP)
  }

  private data class Candidate(
    val reservation: BudgetReservation,
    val pattern: RecurringPattern,
    val amountDiff: BigDecimal,
  )
}
