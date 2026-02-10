package com.gonezo.presentation

import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.UUID

class GetInvestmentTransactionsE2ETest : SqliteE2ETest() {

  override fun sqlResources() = listOf("sql/get_investment_transactions_setup.sql")

  @Test
  fun `returns investment transactions for container`() {
    val containerId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")

    val transactions = app.investmentTransactionRepository.listByContainer(containerId)

    assertThat(transactions).hasSize(2)
    val ids = transactions.map { it.id.toString() }.toSet()
    assertThat(ids).containsExactlyInAnyOrder(
      "dddddddd-dddd-dddd-dddd-dddddddddddd",
      "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    )
  }
}
