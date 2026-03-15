package com.gonezo.presentation.ledger

import com.gonezo.application.ledger.GetLedgerAccountBalanceQuery
import com.gonezo.application.ledger.OpenLedgerAccountCommand
import com.gonezo.application.ledger.RecordLedgerTransferCommand
import com.gonezo.application.ledger.VoidLedgerTransactionCommand
import com.gonezo.domain.ledger.AccountType
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class RecordLedgerTransferE2ETest : SqliteE2ETest() {

  @Test
  fun `records transfer as two linked transactions and updates balances`() {
    val fromAccountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Wallet",
        type = AccountType.CASH,
        currency = "USD",
        createdAt = Instant.parse("2026-03-15T10:00:00Z"),
      ),
    )
    val toAccountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Savings",
        type = AccountType.SAVINGS,
        currency = "USD",
        createdAt = Instant.parse("2026-03-15T10:01:00Z"),
      ),
    )

    val result = app.ledgerRecordTransferUC.execute(
      RecordLedgerTransferCommand(
        fromAccountId = fromAccountId,
        toAccountId = toAccountId,
        amount = Money(BigDecimal("50.00"), "USD"),
        occurredAt = Instant.parse("2026-03-15T11:00:00Z"),
        description = "move to savings",
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
    assertThat(transferOutRow["status"]).isEqualTo("posted")
    assertThat(transferOutRow["linked_transaction_id"]).isEqualTo(result.transferInId.toString())
    assertThat(com.gonezo.testing.decimal(transferOutRow["amount"])).isEqualByComparingTo(BigDecimal("50.00"))

    assertThat(transferInRow["account_id"]).isEqualTo(toAccountId.toString())
    assertThat(transferInRow["type"]).isEqualTo("transfer_in")
    assertThat(transferInRow["status"]).isEqualTo("posted")
    assertThat(transferInRow["linked_transaction_id"]).isEqualTo(result.transferOutId.toString())
    assertThat(com.gonezo.testing.decimal(transferInRow["amount"])).isEqualByComparingTo(BigDecimal("50.00"))

    val fromBalance = app.ledgerGetAccountBalanceUC.execute(GetLedgerAccountBalanceQuery(fromAccountId))
    val toBalance = app.ledgerGetAccountBalanceUC.execute(GetLedgerAccountBalanceQuery(toAccountId))
    assertThat(fromBalance.amount).isEqualByComparingTo(BigDecimal("-50.00"))
    assertThat(toBalance.amount).isEqualByComparingTo(BigDecimal("50.00"))

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
}
