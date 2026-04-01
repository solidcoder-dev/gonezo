package com.gonezo.ledger.domain.services

import com.gonezo.ledger.domain.Transaction
import com.gonezo.domain.shared.Money
import java.math.BigDecimal

class BalanceCalculator {
  fun calculate(currency: String, transactions: List<Transaction>): Money {
    val net = transactions.fold(BigDecimal.ZERO) { acc, tx -> acc + tx.signedAmount() }
    return Money(amount = net, currency = currency)
  }
}
