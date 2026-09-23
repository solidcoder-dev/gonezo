package com.gonezo.application.query

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import java.math.BigDecimal
import java.time.Instant
import java.time.YearMonth
import java.time.ZoneOffset
import java.time.temporal.ChronoUnit

class NetWorthTrendCalculator {
    fun balanceOf(transactions: List<NetWorthTransactionRead>): BigDecimal = transactions.sumOf(::transactionBalanceDelta)

    fun calculate(transactions: List<NetWorthTransactionRead>, currency: CurrencyCode, now: Instant): List<NetWorthTrendPoint> {
        if (transactions.isEmpty()) {
            return emptyTrend(now, currency)
        }

        val currentMonth = YearMonth.from(now.atZone(ZoneOffset.UTC))
        val chronologicalTransactions = transactions
            .asSequence()
            .filter { transactionMonth(it) <= currentMonth }
            .sortedBy(NetWorthTransactionRead::occurredAt)
            .toList()
        if (chronologicalTransactions.isEmpty()) {
            return emptyTrend(now, currency)
        }

        val firstMonth = transactionMonth(chronologicalTransactions.first())
        val monthCount = ChronoUnit.MONTHS.between(firstMonth, currentMonth).toInt() + 1
        var transactionIndex = 0
        var balance = BigDecimal.ZERO

        return (0 until monthCount).map { monthOffset ->
            val month = firstMonth.plusMonths(monthOffset.toLong())
            while (transactionIndex < chronologicalTransactions.size && transactionMonth(chronologicalTransactions[transactionIndex]) == month) {
                balance = balance.add(transactionBalanceDelta(chronologicalTransactions[transactionIndex]))
                transactionIndex++
            }
            NetWorthTrendPoint(month.toString(), Money(balance, currency.value))
        }
    }

    private fun transactionMonth(transaction: NetWorthTransactionRead): YearMonth = YearMonth.from(transaction.occurredAt.atZone(ZoneOffset.UTC))

    private fun transactionBalanceDelta(transaction: NetWorthTransactionRead): BigDecimal = when (transaction.type.lowercase()) {
        "income", "transfer_in" -> transaction.amount.amount
        "expense", "transfer_out" -> transaction.amount.amount.negate()
        else -> BigDecimal.ZERO
    }

    private fun emptyTrend(now: Instant, currency: CurrencyCode): List<NetWorthTrendPoint> {
        val currentMonth = YearMonth.from(now.atZone(ZoneOffset.UTC))
        return (5 downTo 0).map { offset ->
            val month = currentMonth.minusMonths(offset.toLong())
            NetWorthTrendPoint(month.toString(), Money(BigDecimal.ZERO, currency.value))
        }
    }
}
