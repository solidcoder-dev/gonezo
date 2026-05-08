package com.gonezo.persistence.ledger

import com.gonezo.domain.shared.Money
import com.gonezo.ledger.application.OpenLedgerAccountCommand
import com.gonezo.ledger.application.RecordLedgerExpenseCommand
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant

class JdbcLedgerAccountRepositoryE2ETest : SqliteE2ETest() {

  @Test
  fun `ledger account repository deletes only ledger-owned rows`() {
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
    insertTaxonomyProjection(transactionId.toString(), categoryId, tagId)

    app.ledgerAccountRepository.deleteById(accountId)

    assertThat(countRows("ledger_accounts", "id", accountId.toString())).isEqualTo(0)
    assertThat(countRows("ledger_transactions", "account_id", accountId.toString())).isEqualTo(0)
    assertThat(countRows("taxonomy_transaction_assignments", "transaction_id", transactionId.toString())).isEqualTo(1)
    assertThat(countRows("taxonomy_transaction_tag_assignments", "transaction_id", transactionId.toString())).isEqualTo(1)
    assertThat(countRows("workflow_tx_categorization", "transaction_id", transactionId.toString())).isEqualTo(1)
  }

  private fun insertTaxonomyProjection(transactionId: String, categoryId: String, tagId: String) {
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
      transactionId,
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
      transactionId,
      tagId,
      "2026-03-22T10:06:00Z",
    )
    db.jdbcTemplate.update(
      "insert into workflow_tx_categorization (transaction_id, requested_category_id, status, error_code, error_message, attempts, next_attempt_at, updated_at, created_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      transactionId,
      categoryId,
      "assigned",
      null,
      null,
      1,
      null,
      "2026-03-22T10:06:00Z",
      "2026-03-22T10:06:00Z",
    )
  }

  private fun countRows(tableName: String, columnName: String, value: String): Int =
    db.jdbcTemplate.queryForObject(
      "select count(*) from $tableName where $columnName = ?",
      Int::class.java,
      value,
    ) ?: 0
}
