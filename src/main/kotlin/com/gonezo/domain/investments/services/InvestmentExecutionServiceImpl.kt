package com.gonezo.domain.investments.services

import com.gonezo.domain.investments.InvestmentTransaction

class InvestmentExecutionServiceImpl : InvestmentExecutionService {

  override fun execute(transaction: InvestmentTransaction): InvestmentTransaction {
    return transaction
  }
}
