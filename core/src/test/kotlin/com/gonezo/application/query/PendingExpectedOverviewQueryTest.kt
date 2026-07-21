package com.gonezo.application.query

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class PendingExpectedOverviewQueryTest {
  @Test
  fun `separates pending expenses and incomes without mixing currencies`() {
    val result = service(
      preferredCurrency = "EUR",
      rows = listOf(
        row("expense", "EUR", "2800.10"),
        row("expense", "EUR", "4.57"),
        row("expense", "BRL", "940.00"),
        row("income", "USD", "125.30"),
        row("income", "USD", "0.20"),
        row("income", "EUR", "7143.75"),
      ).flatten(),
    ).execute(PendingExpectedOverviewQuery("EUR"))

    assertThat(result.expenses.totalCount).isEqualTo(3)
    assertThat(result.expenses.amountsByCurrency).extracting<String> { it.currency }
      .containsExactly("EUR", "BRL")
    assertThat(result.expenses.amountsByCurrency[0].amount).isEqualTo("2804.67")
    assertThat(result.expenses.amountsByCurrency[0].movementCount).isEqualTo(2)
    assertThat(result.expenses.amountsByCurrency[1].amount).isEqualTo("940.00")
    assertThat(result.incomes.totalCount).isEqualTo(3)
    assertThat(result.incomes.amountsByCurrency[0].currency).isEqualTo("EUR")
    assertThat(result.incomes.amountsByCurrency[1].currency).isEqualTo("USD")
    assertThat(result.incomes.amountsByCurrency[1].amount).isEqualTo("125.50")
  }

  @Test
  fun `orders remaining currencies by count and alphabetically on ties`() {
    val result = service(
      preferredCurrency = null,
      rows = listOf(
        row("expense", "USD", "1", count = 1),
        row("expense", "BRL", "1", count = 2),
        row("expense", "CAD", "1", count = 2),
      ).flatten(),
    ).execute(PendingExpectedOverviewQuery(null))

    assertThat(result.expenses.amountsByCurrency).extracting<String> { it.currency }
      .containsExactly("BRL", "CAD", "USD")
  }

  private fun service(preferredCurrency: String?, rows: List<PendingExpectedMovementRead>) =
    GetPendingExpectedOverviewService(object : PendingExpectedOverviewReadPort {
      override fun read() = rows
    })

  private fun row(type: String, currency: String, amount: String, count: Int = 1) =
    List(count) { PendingExpectedMovementRead(type, currency, amount) }
}
