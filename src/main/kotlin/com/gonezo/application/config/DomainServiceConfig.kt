package com.gonezo.application.config

import com.gonezo.domain.budgeting.ports.BudgetPlanRepository
import com.gonezo.domain.budgeting.ports.RecurringPatternRepository
import com.gonezo.domain.budgeting.services.BudgetAllocatorService
import com.gonezo.domain.budgeting.services.BudgetAllocatorServiceImpl
import com.gonezo.domain.budgeting.services.BudgetLinkService
import com.gonezo.domain.budgeting.services.BudgetLinkServiceImpl
import com.gonezo.domain.budgeting.services.PeriodClosingService
import com.gonezo.domain.budgeting.services.PeriodClosingServiceImpl
import com.gonezo.domain.budgeting.services.ReservationService
import com.gonezo.domain.budgeting.services.ReservationServiceImpl
import com.gonezo.domain.cashledger.services.LedgerPostingService
import com.gonezo.domain.cashledger.services.LedgerPostingServiceImpl
import com.gonezo.domain.investments.services.InvestmentExecutionService
import com.gonezo.domain.investments.services.InvestmentExecutionServiceImpl
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class DomainServiceConfig {

  @Bean
  fun budgetAllocatorService(budgetPlanRepository: BudgetPlanRepository): BudgetAllocatorService =
    BudgetAllocatorServiceImpl(budgetPlanRepository)

  @Bean
  fun reservationService(): ReservationService = ReservationServiceImpl()

  @Bean
  fun periodClosingService(recurringPatternRepository: RecurringPatternRepository): PeriodClosingService =
    PeriodClosingServiceImpl(recurringPatternRepository)

  @Bean
  fun budgetLinkService(): BudgetLinkService = BudgetLinkServiceImpl()

  @Bean
  fun ledgerPostingService(): LedgerPostingService = LedgerPostingServiceImpl()

  @Bean
  fun investmentExecutionService(): InvestmentExecutionService = InvestmentExecutionServiceImpl()
}
