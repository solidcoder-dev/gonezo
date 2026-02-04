package com.gonezo.application.services

import com.gonezo.domain.shared.Money
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class TransferBudgetImpactService {

  fun applyTransfer(
    fromCategoryId: UUID?,
    toCategoryId: UUID?,
    effectiveDate: java.time.LocalDate,
    amount: Money,
    categoryBalanceUpdaterService: CategoryBalanceUpdaterService,
  ) {
    fromCategoryId?.let { categoryId ->
      categoryBalanceUpdaterService.applyExpense(
        categoryId = categoryId,
        effectiveDate = effectiveDate,
        amount = amount,
      )
    }

    toCategoryId?.let { categoryId ->
      categoryBalanceUpdaterService.applyIncome(
        categoryId = categoryId,
        effectiveDate = effectiveDate,
        amount = amount,
      )
    }
  }
}
