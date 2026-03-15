package com.gonezo.presentation.ledger

import com.gonezo.application.ledger.OpenLedgerAccountCommand
import com.gonezo.domain.ledger.AccountType
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Instant

class OpenLedgerAccountE2ETest : SqliteE2ETest() {

  @Test
  fun `opens ledger account and persists account aggregate`() {
    val accountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Banco BBVA",
        type = AccountType.BANK,
        currency = "EUR",
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
}
