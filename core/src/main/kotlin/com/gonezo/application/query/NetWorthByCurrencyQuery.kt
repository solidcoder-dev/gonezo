package com.gonezo.application.query

import com.gonezo.domain.shared.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.ledger.domain.AccountId
import java.math.BigDecimal
import java.time.Instant
import java.time.YearMonth
import java.time.ZoneOffset

data class NetWorthByCurrencyQuery(
  val now: Instant,
  val preferredAccountId: AccountId?,
)

data class NetWorthAccountRead(
  val id: AccountId,
  val currency: CurrencyCode,
)

data class NetWorthTransactionRead(
  val accountId: AccountId,
  val type: String,
  val status: String,
  val amount: Money,
  val occurredAt: Instant,
)

data class NetWorthByCurrencyReadData(
  val accounts: List<NetWorthAccountRead>,
  val transactions: List<NetWorthTransactionRead>,
)

interface NetWorthByCurrencyReadPort {
  fun read(): NetWorthByCurrencyReadData
}

data class NetWorthTrendPoint(
  val period: String,
  val balance: Money,
)

data class NetWorthByCurrencyItem(
  val currency: CurrencyCode,
  val balance: Money,
  val accountCount: Int,
  val isPreferred: Boolean,
  val trend: List<NetWorthTrendPoint>,
)

data class NetWorthByCurrencyResult(
  val items: List<NetWorthByCurrencyItem>,
)

interface GetNetWorthByCurrencyQuery {
  fun execute(query: NetWorthByCurrencyQuery): NetWorthByCurrencyResult
}

class GetNetWorthByCurrencyService(
  private val readPort: NetWorthByCurrencyReadPort,
) : GetNetWorthByCurrencyQuery {
  override fun execute(query: NetWorthByCurrencyQuery): NetWorthByCurrencyResult {
    val readData = readPort.read()
    val accountCurrencyById = readData.accounts.associate { it.id to it.currency }
    val preferredCurrency = query.preferredAccountId?.let(accountCurrencyById::get)
    val currencies = readData.accounts.map { it.currency }.distinct()
    val periods = trendPeriods(query.now)

    val items = currencies.map { currency ->
      val currencyTransactions = readData.transactions.filter {
        it.status.equals("posted", ignoreCase = true)
          && it.accountId in accountCurrencyById
          && accountCurrencyById[it.accountId] == currency
      }
      NetWorthByCurrencyItem(
        currency = currency,
        balance = Money(sumBalance(currencyTransactions, null), currency.value),
        accountCount = readData.accounts.count { it.currency == currency },
        isPreferred = currency == preferredCurrency,
        trend = periods.map { period ->
          NetWorthTrendPoint(
            period = period.key,
            balance = Money(sumBalance(currencyTransactions, period.end), currency.value),
          )
        },
      )
    }.sortedWith(compareByDescending<NetWorthByCurrencyItem> { it.isPreferred }.thenBy { it.currency.value })

    return NetWorthByCurrencyResult(items)
  }

  private fun sumBalance(transactions: List<NetWorthTransactionRead>, before: Instant?): BigDecimal =
    transactions
      .asSequence()
      .filter { before == null || it.occurredAt < before }
      .sumOf { transaction ->
        when (transaction.type.lowercase()) {
          "income", "transfer_in" -> transaction.amount.amount
          "expense", "transfer_out" -> transaction.amount.amount.negate()
          else -> BigDecimal.ZERO
        }
      }

  private fun trendPeriods(now: Instant): List<TrendPeriod> {
    val current = YearMonth.from(now.atZone(ZoneOffset.UTC))
    return (5 downTo 0).map { offset ->
      val month = current.minusMonths(offset.toLong())
      TrendPeriod(month.toString(), month.plusMonths(1).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant())
    }
  }

  private data class TrendPeriod(val key: String, val end: Instant)
}
