package com.gonezo.application.query

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.ledger.domain.AccountId
import java.time.Instant

data class NetWorthByCurrencyQuery(val now: Instant, val preferredAccountId: AccountId?)

data class NetWorthAccountRead(val id: AccountId, val currency: CurrencyCode)

data class NetWorthTransactionRead(val accountId: AccountId, val type: String, val status: String, val amount: Money, val occurredAt: Instant)

data class NetWorthByCurrencyReadData(val accounts: List<NetWorthAccountRead>, val transactions: List<NetWorthTransactionRead>)

interface NetWorthByCurrencyReadPort {
    fun read(): NetWorthByCurrencyReadData
}

data class NetWorthTrendPoint(val period: String, val balance: Money)

data class NetWorthByCurrencyItem(val currency: CurrencyCode, val balance: Money, val accountCount: Int, val isPreferred: Boolean, val trend: List<NetWorthTrendPoint>)

data class NetWorthByCurrencyResult(val items: List<NetWorthByCurrencyItem>)

interface GetNetWorthByCurrencyQuery {
    fun execute(query: NetWorthByCurrencyQuery): NetWorthByCurrencyResult
}

class GetNetWorthByCurrencyService(
    private val readPort: NetWorthByCurrencyReadPort,
    private val trendCalculator: NetWorthTrendCalculator = NetWorthTrendCalculator(),
) : GetNetWorthByCurrencyQuery {
    override fun execute(query: NetWorthByCurrencyQuery): NetWorthByCurrencyResult {
        val readData = readPort.read()
        val accountCurrencyById = readData.accounts.associate { it.id to it.currency }
        val preferredCurrency = query.preferredAccountId?.let(accountCurrencyById::get)
        val currencies = readData.accounts.map { it.currency }.distinct()
        val items =
            currencies
                .map { currency ->
                    val currencyTransactions =
                        readData.transactions.filter {
                            it.status.equals("posted", ignoreCase = true) &&
                                it.accountId in accountCurrencyById &&
                                accountCurrencyById[it.accountId] == currency
                        }
                    NetWorthByCurrencyItem(
                        currency = currency,
                        balance = Money(trendCalculator.balanceOf(currencyTransactions), currency.value),
                        accountCount = readData.accounts.count { it.currency == currency },
                        isPreferred = currency == preferredCurrency,
                        trend = trendCalculator.calculate(currencyTransactions, currency, query.now),
                    )
                }.sortedWith(compareByDescending<NetWorthByCurrencyItem> { it.isPreferred }.thenBy { it.currency.value })

        return NetWorthByCurrencyResult(items)
    }

}
