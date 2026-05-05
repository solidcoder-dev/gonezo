package com.gonezo.presentation.ledger

import com.gonezo.ledger.application.AddLedgerTransactionItemCommand
import com.gonezo.ledger.application.CreateLedgerExpenseDraftCommand
import com.gonezo.ledger.application.OpenLedgerAccountCommand
import com.gonezo.ledger.application.PostLedgerDraftTransactionCommand
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class LedgerDraftItemsE2ETest : SqliteE2ETest() {

  @Test
  fun `posts draft expense when items match total`() {
    val accountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Bank",
        type = AccountType.BANK,
        currency = CurrencyCode.from("EUR"),
        createdAt = Instant.parse("2026-03-15T10:00:00Z"),
      ),
    )

    val txId = app.ledgerCreateExpenseDraftUC.execute(
      CreateLedgerExpenseDraftCommand(
        accountId = accountId,
        amount = Money(BigDecimal("80.00"), "EUR"),
        occurredAt = Instant.parse("2026-03-15T11:00:00Z"),
        description = "Ticket",
        merchant = "Mercadona",
      ),
    )

    app.ledgerAddTransactionItemUC.execute(
      AddLedgerTransactionItemCommand(
        transactionId = txId,
        name = "Comida",
        amount = Money(BigDecimal("50.00"), "EUR"),
        note = null,
      ),
    )
    app.ledgerAddTransactionItemUC.execute(
      AddLedgerTransactionItemCommand(
        transactionId = txId,
        name = "Limpieza",
        amount = Money(BigDecimal("20.00"), "EUR"),
        note = null,
      ),
    )
    app.ledgerAddTransactionItemUC.execute(
      AddLedgerTransactionItemCommand(
        transactionId = txId,
        name = "Farmacia",
        amount = Money(BigDecimal("10.00"), "EUR"),
        note = null,
      ),
    )

    app.ledgerPostDraftTransactionUC.execute(PostLedgerDraftTransactionCommand(txId))

    val txRow = db.jdbcTemplate.queryForMap(
      "select status from ledger_transactions where id = ?",
      txId.toString(),
    )
    assertThat(txRow["status"]).isEqualTo("posted")

    val count = db.jdbcTemplate.queryForObject(
      "select count(*) from ledger_transaction_items where transaction_id = ?",
      Int::class.java,
      txId.toString(),
    )
    assertThat(count).isEqualTo(3)
  }
}
