package com.gonezo.application.services

import com.gonezo.domain.investments.InvestmentTransaction
import com.gonezo.domain.investments.services.InvestmentExecutionService
import org.springframework.stereotype.Service

@Service
class InvestmentExecutionServiceImpl : InvestmentExecutionService {

  override fun execute(transaction: InvestmentTransaction): InvestmentTransaction {
    return transaction
  }
}
