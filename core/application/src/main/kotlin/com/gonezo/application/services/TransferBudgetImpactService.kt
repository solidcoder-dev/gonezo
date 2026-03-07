package com.gonezo.application.services
import com.gonezo.domain.shared.Money
import java.util.UUID
class TransferBudgetImpactService {
  fun applyTransfer(
    fromCategoryId: UUID?,
    toCategoryId: UUID?,
    fromEffectiveDate: java.time.LocalDate?,
    toEffectiveDate: java.time.LocalDate?,
    amount: Money,
    categoryBalanceUpdaterService: CategoryBalanceUpdaterService,
  ) {
    fromCategoryId?.let { categoryId ->
      val date = requireNotNull(fromEffectiveDate) { "fromEffectiveDate is required when fromCategoryId is provided." }
      categoryBalanceUpdaterService.applyExpense(
        categoryId = categoryId,
        effectiveDate = date,
        amount = amount,
      )
    }
    toCategoryId?.let { categoryId ->
      val date = requireNotNull(toEffectiveDate) { "toEffectiveDate is required when toCategoryId is provided." }
      categoryBalanceUpdaterService.applyIncome(
        categoryId = categoryId,
        effectiveDate = date,
        amount = amount,
      )
    }
  }
}
