package com.gonezo.presentation.ledger

import com.gonezo.application.ledger.GetLedgerAccountBalanceQuery
import com.gonezo.application.ledger.OpenLedgerAccountCommand
import com.gonezo.application.ledger.RecordLedgerExpenseCommand
import com.gonezo.application.ledger.VoidLedgerTransactionCommand
import com.gonezo.domain.ledger.AccountType
import com.gonezo.domain.ledger.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class VoidLedgerTransactionE2ETest : SqliteE2ETest() {

  @Test
  fun `voided transaction no longer impacts balance`() {
    val accountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Cash",
        type = AccountType.CASH,
        currency = CurrencyCode.from("USD"),
        createdAt = Instant.parse("2026-03-15T10:00:00Z"),
      ),
    )

    val txId = app.ledgerRecordExpenseUC.execute(
      RecordLedgerExpenseCommand(
        accountId = accountId,
        amount = Money(BigDecimal("30.00"), "USD"),
        occurredAt = Instant.parse("2026-03-15T11:00:00Z"),
        description = "Snacks",
        merchant = "Store",
      ),
    )

    app.ledgerVoidTransactionUC.execute(VoidLedgerTransactionCommand(txId))

    val row = db.jdbcTemplate.queryForMap(
      "select status from ledger_transactions where id = ?",
      txId.toString(),
    )
    assertThat(row["status"]).isEqualTo("voided")

    val balance = app.ledgerGetAccountBalanceUC.execute(GetLedgerAccountBalanceQuery(accountId))
    assertThat(balance.amount).isEqualByComparingTo(BigDecimal.ZERO)
  }
}
