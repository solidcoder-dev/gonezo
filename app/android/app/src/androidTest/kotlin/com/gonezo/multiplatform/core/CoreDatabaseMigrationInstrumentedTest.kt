package com.gonezo.multiplatform.core

import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteException
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CoreDatabaseMigration29To30Test {
  @Test
  fun upgradesProductionDatabaseFrom29To30WithoutChangingExistingRows() {
    val name = uniqueDatabaseName()
    val initial = CoreDatabase(context(), name)
    val sqlite = initial.writableDatabase
    sqlite.execSQL("insert into ledger_accounts(id, name, type, currency, status, created_at) values ('account-1', 'Checking', 'asset', 'USD', 'active', '2026-07-01T00:00:00Z')")
    sqlite.execSQL("insert into ledger_transactions(id, account_id, type, amount, currency, occurred_at, description, merchant, status) values ('transaction-1', 'account-1', 'expense', '12.34', 'USD', '2026-07-02T00:00:00Z', 'Lunch', 'Cafe', 'posted')")
    sqlite.execSQL("insert into ledger_transaction_items(id, transaction_id, name, amount, currency) values ('item-1', 'transaction-1', 'Lunch', '12.34', 'USD')")
    sqlite.execSQL("insert into taxonomy_transaction_assignments(transaction_id, category_id, assigned_at) values ('transaction-1', '00000000-0000-4000-8000-000000000102', '2026-07-02T00:00:00Z')")
    sqlite.execSQL("insert into taxonomy_tags(id, name, name_normalized, status, created_at) values ('tag-1', 'Food', 'food', 'active', '2026-07-01T00:00:00Z')")
    sqlite.execSQL("insert into taxonomy_transaction_tag_assignments(transaction_id, tag_id, assigned_at) values ('transaction-1', 'tag-1', '2026-07-02T00:00:00Z')")
    sqlite.execSQL("insert into recurring_movements(id, movement_type, source_account_id, amount, currency, rule_frequency, rule_interval, rule_monthly_pattern, end_kind, start_at, zone_id, status, created_at, updated_at) values ('recurring-1', 'expense', 'account-1', '20.00', 'USD', 'monthly', 1, 'day_of_month', 'never', '2026-07-03T00:00:00Z', 'UTC', 'active', '2026-07-01T00:00:00Z', '2026-07-01T00:00:00Z')")
    sqlite.execSQL("insert into recurring_movement_occurrences(id, recurring_movement_id, due_at, status, created_at, updated_at) values ('occurrence-1', 'recurring-1', '2026-08-03T00:00:00Z', 'pending', '2026-07-01T00:00:00Z', '2026-07-01T00:00:00Z')")
    sqlite.execSQL("insert into expected_movements(id, account_id, movement_type, amount, currency, expected_at, status, created_at, updated_at) values ('expected-1', 'account-1', 'expense', '30.00', 'USD', '2026-07-04T00:00:00Z', 'pending', '2026-07-01T00:00:00Z', '2026-07-01T00:00:00Z')")
    sqlite.execSQL("insert into expected_movement_items(id, expected_movement_id, item_order, name, amount) values ('expected-item-1', 'expected-1', 0, 'Planned', '30.00')")
    sqlite.execSQL("insert into sharing_persons(id, display_name, normalized_name, created_at) values ('person-1', 'Alex', 'alex', '2026-07-01T00:00:00Z')")
    sqlite.execSQL("insert into sharing_expense_shares(id, source_transaction_id, payer_person_id, total_amount, currency, created_at, updated_at) values ('share-1', 'transaction-1', 'person-1', '12.34', 'USD', '2026-07-02T00:00:00Z', '2026-07-02T00:00:00Z')")
    sqlite.execSQL("insert into sharing_expense_share_participants(id, share_id, person_id, amount, reimbursable, expected_movement_id) values ('participant-1', 'share-1', 'person-1', '12.34', 1, 'expected-1')")
    sqlite.execSQL("insert into user_preferences(owner_id, default_account_id, updated_at) values ('owner-1', 'account-1', '2026-07-01T00:00:00Z')")
    sqlite.execSQL("insert into expected_posting_attempts(idempotency_key, expected_movement_id, transaction_id, completed_at) values ('key-1', 'expected-1', 'transaction-1', '2026-07-02T00:00:00Z')")
    sqlite.execSQL("drop index if exists idx_workflow_tx_categorization_status_next_attempt")
    sqlite.execSQL("drop table if exists workflow_tx_categorization")
    assertFalse(sqlite.hasObject("workflow_tx_categorization", "table"))
    val tablesBeforeUpgrade = sqlite.tableNames().toSet()
    val snapshot = sqlite.snapshot()
    sqlite.setVersion(29)
    initial.close()

    val upgraded = CoreDatabase(context(), name)
    val migrated = upgraded.writableDatabase
    assertEquals(30, migrated.version)
    assertTrue(migrated.hasObject("workflow_tx_categorization", "table"))
    assertEquals(setOf("workflow_tx_categorization"), migrated.tableNames().toSet() - tablesBeforeUpgrade)
    assertTrue(migrated.hasObject("idx_workflow_tx_categorization_status_next_attempt", "index"))
    assertEquals(0, migrated.scalar("select count(*) from workflow_tx_categorization")!!.toInt())
    assertEquals(snapshot, migrated.snapshot())
    assertEquals("ok", migrated.scalar("pragma integrity_check"))
    assertTrue(migrated.rawQuery("pragma foreign_key_check", null).use { !it.moveToNext() })
    upgraded.close()

    val reopened = CoreDatabase(context(), name)
    assertEquals(snapshot, reopened.readableDatabase.snapshot())
    assertEquals(30, reopened.readableDatabase.version)
    assertEquals(0, reopened.readableDatabase.scalar("select count(*) from workflow_tx_categorization")!!.toInt())
    reopened.close()
  }

  @Test
  fun downgradeFailsWithoutDeletingData() {
    val database = CoreDatabase(context(), uniqueDatabaseName())
    val sqlite = database.writableDatabase
    sqlite.execSQL("insert into ledger_accounts(id, name, type, currency, status, created_at) values ('account-1', 'Checking', 'asset', 'USD', 'active', '2026-07-01T00:00:00Z')")
    val before = sqlite.snapshot()

    var failed = false
    try {
      database.onDowngrade(sqlite, 30, 29)
    } catch (error: SQLiteException) {
      failed = true
      assertTrue(error.message!!.contains("not supported"))
    }

    assertTrue(failed)
    assertEquals(before, sqlite.snapshot())
    assertEquals("ok", sqlite.scalar("pragma integrity_check"))
    database.close()
  }

  private fun context() = ApplicationProvider.getApplicationContext<android.content.Context>()

  private fun uniqueDatabaseName() = "gonezo-migration-${System.nanoTime()}.db"

  private fun SQLiteDatabase.snapshot(): Map<String, List<List<String?>>> = tableNames()
    .filterNot { it == "workflow_tx_categorization" }
    .filterNot { it.startsWith("sqlite_") }
    .associateWith { table -> query(table, null, null, null, null, null, null, null).use { cursor ->
      buildList {
        while (cursor.moveToNext()) add((0 until cursor.columnCount).map { if (cursor.isNull(it)) null else cursor.getString(it) })
      }
    } }

  private fun SQLiteDatabase.tableNames(): List<String> = rawQuery("select name from sqlite_master where type = 'table' order by name", null).use { cursor ->
    buildList { while (cursor.moveToNext()) add(cursor.getString(0)) }
  }

  private fun SQLiteDatabase.hasObject(name: String, type: String) = scalar("select name from sqlite_master where type = '$type' and name = '$name'") == name

  private fun SQLiteDatabase.scalar(sql: String): String? = rawQuery(sql, null).use { if (it.moveToFirst() && !it.isNull(0)) it.getString(0) else null }

}
