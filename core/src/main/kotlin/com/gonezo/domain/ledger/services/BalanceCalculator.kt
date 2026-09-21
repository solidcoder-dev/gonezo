package com.gonezo.ledger.domain.services

import com.gonezo.domain.shared.Money
import com.gonezo.ledger.domain.Transaction
import com.gonezo.ledger.domain.TransactionStatus
import java.math.BigDecimal

class BalanceCalculator {
    fun calculate(currency: String, transactions: List<Transaction>): Money {
        val net = transactions.asSequence()
            .filter { it.status == TransactionStatus.POSTED }
            .fold(BigDecimal.ZERO) { acc, tx -> acc + tx.signedAmount() }
        return Money(amount = net, currency = currency)
    }
}
