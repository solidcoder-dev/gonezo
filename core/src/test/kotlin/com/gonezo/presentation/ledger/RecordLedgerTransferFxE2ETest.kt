package com.gonezo.presentation.ledger

import com.gonezo.ledger.application.GetLedgerAccountBalanceQuery
import com.gonezo.ledger.application.OpenLedgerAccountCommand
import com.gonezo.ledger.application.RecordLedgerTransferFxCommand
import com.gonezo.ledger.application.VoidLedgerTransactionCommand
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class RecordLedgerTransferFxE2ETest : SqliteE2ETest() {

  @Test
  fun `records cross-currency transfer as two linked transactions and updates balances`() {
    val fromAccountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Wallet USD",
        type = AccountType.CASH,
        currency = CurrencyCode.from("USD"),
        createdAt = Instant.parse("2026-04-11T10:00:00Z"),
      ),
    )
    val toAccountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Savings EUR",
        type = AccountType.SAVINGS,
        currency = CurrencyCode.from("EUR"),
        createdAt = Instant.parse("2026-04-11T10:01:00Z"),
      ),
    )

    val result = app.ledgerRecordTransferFxUC.execute(
      RecordLedgerTransferFxCommand(
        fromAccountId = fromAccountId,
        toAccountId = toAccountId,
        sourceAmount = Money(BigDecimal("100.00"), "USD"),
        destinationAmount = Money(BigDecimal("92.00"), "EUR"),
        occurredAt = Instant.parse("2026-04-11T10:15:00Z"),
        description = "USD to EUR transfer",
        exchangeRate = BigDecimal("0.92"),
      ),
    )

    val transferOutRow = db.jdbcTemplate.queryForMap(
      """
      select id, account_id, type, amount, currency, status, linked_transaction_id
      from ledger_transactions
      where id = ?
      """.trimIndent(),
      result.transferOutId.toString(),
    )
    val transferInRow = db.jdbcTemplate.queryForMap(
      """
      select id, account_id, type, amount, currency, status, linked_transaction_id
      from ledger_transactions
      where id = ?
      """.trimIndent(),
      result.transferInId.toString(),
    )

    assertThat(transferOutRow["account_id"]).isEqualTo(fromAccountId.toString())
    assertThat(transferOutRow["type"]).isEqualTo("transfer_out")
    assertThat(transferOutRow["currency"]).isEqualTo("USD")
    assertThat(com.gonezo.testing.decimal(transferOutRow["amount"])).isEqualByComparingTo(BigDecimal("100.00"))
    assertThat(transferOutRow["linked_transaction_id"]).isEqualTo(result.transferInId.toString())

    assertThat(transferInRow["account_id"]).isEqualTo(toAccountId.toString())
    assertThat(transferInRow["type"]).isEqualTo("transfer_in")
    assertThat(transferInRow["currency"]).isEqualTo("EUR")
    assertThat(com.gonezo.testing.decimal(transferInRow["amount"])).isEqualByComparingTo(BigDecimal("92.00"))
    assertThat(transferInRow["linked_transaction_id"]).isEqualTo(result.transferOutId.toString())

    val fromBalance = app.ledgerGetAccountBalanceUC.execute(GetLedgerAccountBalanceQuery(fromAccountId))
    val toBalance = app.ledgerGetAccountBalanceUC.execute(GetLedgerAccountBalanceQuery(toAccountId))
    assertThat(fromBalance.amount).isEqualByComparingTo(BigDecimal("-100.00"))
    assertThat(toBalance.amount).isEqualByComparingTo(BigDecimal("92.00"))

    app.ledgerVoidTransactionUC.execute(VoidLedgerTransactionCommand(result.transferOutId))

    val voidedOutStatus = db.jdbcTemplate.queryForObject(
      "select status from ledger_transactions where id = ?",
      String::class.java,
      result.transferOutId.toString(),
    )
    val voidedInStatus = db.jdbcTemplate.queryForObject(
      "select status from ledger_transactions where id = ?",
      String::class.java,
      result.transferInId.toString(),
    )

    assertThat(voidedOutStatus).isEqualTo("voided")
    assertThat(voidedInStatus).isEqualTo("voided")
    assertThat(app.ledgerGetAccountBalanceUC.execute(GetLedgerAccountBalanceQuery(fromAccountId)).amount)
      .isEqualByComparingTo(BigDecimal("0.00"))
    assertThat(app.ledgerGetAccountBalanceUC.execute(GetLedgerAccountBalanceQuery(toAccountId)).amount)
      .isEqualByComparingTo(BigDecimal("0.00"))
  }

  @Test
  fun `rejects cross-currency transfer when amounts do not match exchange rate`() {
    val fromAccountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Wallet USD",
        type = AccountType.CASH,
        currency = CurrencyCode.from("USD"),
        createdAt = Instant.parse("2026-04-11T10:00:00Z"),
      ),
    )
    val toAccountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Savings EUR",
        type = AccountType.SAVINGS,
        currency = CurrencyCode.from("EUR"),
        createdAt = Instant.parse("2026-04-11T10:01:00Z"),
      ),
    )

    assertThatThrownBy {
      app.ledgerRecordTransferFxUC.execute(
        RecordLedgerTransferFxCommand(
          fromAccountId = fromAccountId,
          toAccountId = toAccountId,
          sourceAmount = Money(BigDecimal("100.00"), "USD"),
          destinationAmount = Money(BigDecimal("95.00"), "EUR"),
          occurredAt = Instant.parse("2026-04-11T10:15:00Z"),
          description = "Invalid FX transfer",
          exchangeRate = BigDecimal("0.92"),
        ),
      )
    }
      .isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("Transfer amounts do not match exchange rate")
  }
}
