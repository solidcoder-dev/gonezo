package com.gonezo.presentation.ledger

import com.gonezo.ledger.application.GetLedgerAccountBalanceQuery
import com.gonezo.ledger.application.OpenLedgerAccountCommand
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.application.RecordLedgerIncomeCommand
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class RecordLedgerExpenseAndBalanceE2ETest : SqliteE2ETest() {

  @Test
  fun `records income and expense and computes balance from ledger transactions`() {
    val accountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Wallet",
        type = AccountType.CASH,
        currency = CurrencyCode.from("USD"),
        createdAt = Instant.parse("2026-03-15T10:00:00Z"),
      ),
    )

    app.ledgerRecordIncomeUC.execute(
      RecordLedgerIncomeCommand(
        accountId = accountId,
        amount = Money(BigDecimal("1200.00"), "USD"),
        occurredAt = Instant.parse("2026-03-01T09:00:00Z"),
        description = "Salary",
        merchant = "Payroll",
      ),
    )

    val txId = app.ledgerRecordExpenseUC.execute(
      RecordLedgerExpenseCommand(
        accountId = accountId,
        amount = Money(BigDecimal("80.00"), "USD"),
        occurredAt = Instant.parse("2026-03-15T11:00:00Z"),
        description = "Supermarket",
        merchant = "Mercadona",
      ),
    )

    val txRow = db.jdbcTemplate.queryForMap(
      """
      select id, account_id, type, amount, currency, status, description, merchant
      from ledger_transactions
      where id = ?
      """.trimIndent(),
      txId.toString(),
    )

    assertThat(txRow["id"].toString()).isEqualTo(txId.toString())
    assertThat(txRow["account_id"].toString()).isEqualTo(accountId.toString())
    assertThat(txRow["type"]).isEqualTo("expense")
    assertThat(com.gonezo.testing.decimal(txRow["amount"])).isEqualByComparingTo(BigDecimal("80.00"))
    assertThat(txRow["currency"]).isEqualTo("USD")
    assertThat(txRow["status"]).isEqualTo("posted")
    assertThat(txRow["description"]).isEqualTo("Supermarket")
    assertThat(txRow["merchant"]).isEqualTo("Mercadona")

    val balance = app.ledgerGetAccountBalanceUC.execute(GetLedgerAccountBalanceQuery(accountId))
    assertThat(balance.amount).isEqualByComparingTo(BigDecimal("1120.00"))
    assertThat(balance.currency).isEqualTo("USD")
  }
}
