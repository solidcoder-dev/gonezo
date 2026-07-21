package com.gonezo.application.query

import java.math.BigDecimal

data class PendingExpectedOverviewQuery(val preferredCurrency: String?)

data class PendingExpectedMovementRead(val type: String, val currency: String, val amount: String)

interface PendingExpectedOverviewReadPort { fun read(): List<PendingExpectedMovementRead> }

data class PendingExpectedCurrencySummary(val currency: String, val amount: String, val movementCount: Int)

data class PendingExpectedTypeSummary(val totalCount: Int, val amountsByCurrency: List<PendingExpectedCurrencySummary>)

data class PendingExpectedOverviewResult(
  val expenses: PendingExpectedTypeSummary,
  val incomes: PendingExpectedTypeSummary,
)

interface GetPendingExpectedOverviewQuery {
  fun execute(query: PendingExpectedOverviewQuery): PendingExpectedOverviewResult
}

class GetPendingExpectedOverviewService(
  private val readPort: PendingExpectedOverviewReadPort,
) : GetPendingExpectedOverviewQuery {
  override fun execute(query: PendingExpectedOverviewQuery): PendingExpectedOverviewResult {
    val rows = readPort.read()
    return PendingExpectedOverviewResult(
      summarize(rows, "expense", query.preferredCurrency),
      summarize(rows, "income", query.preferredCurrency),
    )
  }

  private fun summarize(rows: List<PendingExpectedMovementRead>, type: String, preferredCurrency: String?): PendingExpectedTypeSummary {
    val grouped = rows.asSequence()
      .filter { it.type.equals(type, ignoreCase = true) }
      .groupBy { it.currency }
      .map { (currency, currencyRows) ->
        PendingExpectedCurrencySummary(
          currency,
          currencyRows.fold(BigDecimal.ZERO) { total, row -> total + row.amount.toBigDecimal() }.toPlainString(),
          currencyRows.size,
        )
      }
      .sortedWith(
        compareByDescending<PendingExpectedCurrencySummary> { it.currency.equals(preferredCurrency, ignoreCase = true) }
          .thenByDescending { it.movementCount }
          .thenBy { it.currency },
      )
    return PendingExpectedTypeSummary(grouped.sumOf { it.movementCount }, grouped)
  }
}
