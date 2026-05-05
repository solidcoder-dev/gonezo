package com.gonezo.persistence.taxonomy

import com.gonezo.testing.SqliteE2ETest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.UUID

class BackfillTaxonomyAssignmentsMigrationE2ETest : SqliteE2ETest() {

  @Test
  fun `backfills taxonomy assignment from legacy ledger category column`() {
    val accountId = UUID.randomUUID().toString()
    val txId = UUID.randomUUID().toString()
    val categoryId = UUID.randomUUID().toString()

    db.jdbcTemplate.update(
      """
      insert into ledger_accounts (id, name, type, currency, status, created_at, archived_at)
      values (?, ?, ?, ?, ?, ?, null)
      """.trimIndent(),
      accountId,
      "Legacy account",
      "cash",
      "EUR",
      "active",
      "2026-03-22T10:00:00Z",
    )

    db.jdbcTemplate.update(
      """
      insert into taxonomy_categories (id, name, name_normalized, applies_to, status, created_at, archived_at)
      values (?, ?, ?, ?, ?, ?, null)
      """.trimIndent(),
      categoryId,
      "Food",
      "food",
      "expense",
      "active",
      "2026-03-22T10:00:00Z",
    )

    db.jdbcTemplate.update(
      """
      insert into ledger_transactions (
        id, account_id, type, amount, currency, occurred_at, description, merchant, category_id, status, linked_transaction_id
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null)
      """.trimIndent(),
      txId,
      accountId,
      "expense",
      "10.00",
      "EUR",
      "2026-03-22T12:00:00Z",
      "Legacy tx",
      "Store",
      categoryId,
      "posted",
    )

    db.executeSqlResource("db/migration/V4__backfill_taxonomy_assignments.sql")

    val row = db.jdbcTemplate.queryForMap(
      "select transaction_id, category_id from taxonomy_transaction_assignments where transaction_id = ?",
      txId,
    )
    assertThat(row["transaction_id"]).isEqualTo(txId)
    assertThat(row["category_id"]).isEqualTo(categoryId)
  }
}
