package com.gonezo.presentation.ledger

import com.gonezo.ledger.application.DeleteLedgerAccountCommand
import com.gonezo.ledger.application.OpenLedgerAccountCommand
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.domain.shared.Money
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class DeleteLedgerAccountE2ETest : SqliteE2ETest() {

  @Test
  fun `deletes account and all associated transaction projections`() {
    val categoryCountBefore = db.jdbcTemplate.queryForObject("select count(*) from taxonomy_categories", Int::class.java)!!
    val tagCountBefore = db.jdbcTemplate.queryForObject("select count(*) from taxonomy_tags", Int::class.java)!!

    val accountId = app.ledgerOpenAccountUC.execute(
      OpenLedgerAccountCommand(
        name = "Cash",
        type = AccountType.CASH,
        currency = CurrencyCode.from("EUR"),
        createdAt = Instant.parse("2026-03-22T10:00:00Z"),
      ),
    )

    val transactionId = app.ledgerRecordExpenseUC.execute(
      RecordLedgerExpenseCommand(
        accountId = accountId,
        amount = Money(BigDecimal("12.34"), "EUR"),
        occurredAt = Instant.parse("2026-03-22T10:05:00Z"),
        description = "Coffee",
        merchant = "Bar",
      ),
    )

    val categoryId = "11111111-1111-1111-1111-111111111111"
    val tagId = "22222222-2222-2222-2222-222222222222"
    db.jdbcTemplate.update(
      "insert into taxonomy_categories (id, name, name_normalized, applies_to, status, created_at, archived_at) values (?, ?, ?, ?, ?, ?, ?)",
      categoryId,
      "Food",
      "food",
      "expense",
      "active",
      "2026-03-22T10:00:00Z",
      null,
    )
    db.jdbcTemplate.update(
      "insert into taxonomy_transaction_assignments (transaction_id, category_id, assigned_at) values (?, ?, ?)",
      transactionId.toString(),
      categoryId,
      "2026-03-22T10:06:00Z",
    )

    db.jdbcTemplate.update(
      "insert into taxonomy_tags (id, name, name_normalized, status, created_at, archived_at) values (?, ?, ?, ?, ?, ?)",
      tagId,
      "trip",
      "trip",
      "active",
      "2026-03-22T10:00:00Z",
      null,
    )
    db.jdbcTemplate.update(
      "insert into taxonomy_transaction_tag_assignments (transaction_id, tag_id, assigned_at) values (?, ?, ?)",
      transactionId.toString(),
      tagId,
      "2026-03-22T10:06:00Z",
    )

    db.jdbcTemplate.update(
      "insert into workflow_tx_categorization (transaction_id, requested_category_id, status, error_code, error_message, attempts, next_attempt_at, updated_at, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      transactionId.toString(),
      categoryId,
      "assigned",
      null,
      null,
      1,
      null,
      "2026-03-22T10:06:00Z",
      "2026-03-22T10:06:00Z",
    )

    app.ledgerDeleteAccountUC.execute(DeleteLedgerAccountCommand(accountId = accountId))

    assertThat(
      db.jdbcTemplate.queryForObject(
        "select count(*) from ledger_accounts where id = ?",
        Int::class.java,
        accountId.toString(),
      ),
    ).isEqualTo(0)

    assertThat(
      db.jdbcTemplate.queryForObject(
        "select count(*) from ledger_transactions where account_id = ?",
        Int::class.java,
        accountId.toString(),
      ),
    ).isEqualTo(0)

    assertThat(
      db.jdbcTemplate.queryForObject(
        "select count(*) from ledger_transaction_items where transaction_id = ?",
        Int::class.java,
        transactionId.toString(),
      ),
    ).isEqualTo(0)

    assertThat(
      db.jdbcTemplate.queryForObject(
        "select count(*) from taxonomy_transaction_assignments where transaction_id = ?",
        Int::class.java,
        transactionId.toString(),
      ),
    ).isEqualTo(0)

    assertThat(
      db.jdbcTemplate.queryForObject(
        "select count(*) from taxonomy_transaction_tag_assignments where transaction_id = ?",
        Int::class.java,
        transactionId.toString(),
      ),
    ).isEqualTo(0)

    assertThat(
      db.jdbcTemplate.queryForObject(
        "select count(*) from workflow_tx_categorization where transaction_id = ?",
        Int::class.java,
        transactionId.toString(),
      ),
    ).isEqualTo(0)

    assertThat(db.jdbcTemplate.queryForObject("select count(*) from taxonomy_categories", Int::class.java)).isEqualTo(categoryCountBefore + 1)
    assertThat(db.jdbcTemplate.queryForObject("select count(*) from taxonomy_tags", Int::class.java)).isEqualTo(tagCountBefore + 1)
  }
}
