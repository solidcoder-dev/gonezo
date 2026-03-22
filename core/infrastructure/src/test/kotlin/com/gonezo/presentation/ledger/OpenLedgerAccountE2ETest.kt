package com.gonezo.presentation.ledger

import com.gonezo.ledger.application.GetLedgerAccountBalanceQuery
import com.gonezo.ledger.application.OpenLedgerAccountCommand
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class OpenLedgerAccountE2ETest : SqliteE2ETest() {

  @Test
  fun `opens ledger account and persists account aggregate`() {
    val accountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Banco BBVA",
        type = AccountType.BANK,
        currency = CurrencyCode.from("EUR"),
        createdAt = Instant.parse("2026-03-15T10:00:00Z"),
      ),
    )

    val row = db.jdbcTemplate.queryForMap(
      """
      select id, name, type, currency, status, created_at, archived_at
      from ledger_accounts
      where id = ?
      """.trimIndent(),
      accountId.toString(),
    )

    assertThat(row["id"].toString()).isEqualTo(accountId.toString())
    assertThat(row["name"]).isEqualTo("Banco BBVA")
    assertThat(row["type"]).isEqualTo("bank")
    assertThat(row["currency"]).isEqualTo("EUR")
    assertThat(row["status"]).isEqualTo("active")
    assertThat(row["created_at"].toString()).startsWith("2026-03-15T10:00:00")
    assertThat(row["archived_at"]).isNull()
  }

  @Test
  fun `opens account with opening balance by posting opening transaction`() {
    val accountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Wallet",
        type = AccountType.CASH,
        currency = CurrencyCode.from("USD"),
        createdAt = Instant.parse("2026-03-15T10:00:00Z"),
        openingBalanceAmount = BigDecimal("150.00"),
      ),
    )

    val txRow = db.jdbcTemplate.queryForMap(
      """
      select account_id, type, amount, currency, status, description
      from ledger_transactions
      where account_id = ?
      """.trimIndent(),
      accountId.toString(),
    )

    assertThat(txRow["account_id"]).isEqualTo(accountId.toString())
    assertThat(txRow["type"]).isEqualTo("income")
    assertThat(com.gonezo.testing.decimal(txRow["amount"])).isEqualByComparingTo(BigDecimal("150.00"))
    assertThat(txRow["currency"]).isEqualTo("USD")
    assertThat(txRow["status"]).isEqualTo("posted")
    assertThat(txRow["description"]).isEqualTo("Opening balance")

    val balance = app.ledgerGetAccountBalanceUC.execute(GetLedgerAccountBalanceQuery(accountId))
    assertThat(balance.amount).isEqualByComparingTo(BigDecimal("150.00"))
    assertThat(balance.currency).isEqualTo("USD")
  }
}
