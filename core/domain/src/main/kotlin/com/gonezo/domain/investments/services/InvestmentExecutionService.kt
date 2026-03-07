package com.gonezo.domain.investments.services

import com.gonezo.domain.investments.InvestmentTransaction

interface InvestmentExecutionService {
  fun execute(transaction: InvestmentTransaction): InvestmentTransaction
}
