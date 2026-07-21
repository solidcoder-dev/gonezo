package com.gonezo.multiplatform.core

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.gonezo.application.orchestration.PostExpectedMovementCommand
import com.gonezo.application.orchestration.ExpectedPostingMovementSnapshot
import com.gonezo.expected.domain.ExpectedMovementType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.time.Instant
import java.math.BigDecimal
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class AndroidExpectedPostingIntegrationTest {
  @Test
  fun postsCategorizedExpectedMovementExactlyOnceWithIdempotency() {
    val context = ApplicationProvider.getApplicationContext<android.content.Context>()
    val database = CoreDatabase(context)
    val sqlite = database.writableDatabase
    val originalAccountId = UUID.randomUUID().toString()
    val finalAccountId = UUID.randomUUID().toString()
    val expectedId = UUID.randomUUID().toString()
    val categoryId = "00000000-0000-4000-8000-000000000102"
    val timestamp = Instant.parse("2026-07-10T00:00:00Z")
    sqlite.execSQL("insert into ledger_accounts(id, name, type, currency, status, created_at) values (?, ?, 'asset', 'USD', 'active', ?)", arrayOf(originalAccountId, "Original account", timestamp.toString()))
    sqlite.execSQL("insert into ledger_accounts(id, name, type, currency, status, created_at) values (?, ?, 'asset', 'GBP', 'active', ?)", arrayOf(finalAccountId, "Final account", timestamp.toString()))
    sqlite.execSQL("insert into expected_movements(id, account_id, movement_type, amount, currency, expected_at, description, category_id, status, created_at, updated_at) values (?, ?, 'expense', '12.00', 'EUR', ?, 'Expected original', ?, 'pending', ?, ?)", arrayOf(expectedId, originalAccountId, timestamp.toString(), categoryId, timestamp.toString(), timestamp.toString()))
    database.close()

    val command = PostExpectedMovementCommand(
      expectedId,
      ExpectedPostingMovementSnapshot(finalAccountId, ExpectedMovementType.EXPENSE, BigDecimal("50.00"), "GBP", "Actual final", "Actual final", emptyList()),
      timestamp,
      categoryId,
      idempotencyKey = "integration-key-${UUID.randomUUID()}",
    )
    val application = AndroidExpectedPostingApplication.getInstance(context)
    val first = application.execute(command)
    val second = application.execute(command)
    val readable = CoreDatabase(context).readableDatabase

    assertEquals(first, second)
    assertEquals(1, readable.scalar("select count(*) from ledger_transactions where id = '${first.transactionId}'")!!.toInt())
    assertEquals(finalAccountId, readable.scalar("select account_id from ledger_transactions where id = '${first.transactionId}'"))
    assertEquals("expense", readable.scalar("select type from ledger_transactions where id = '${first.transactionId}'"))
    assertEquals("50.00", readable.scalar("select amount from ledger_transactions where id = '${first.transactionId}'"))
    assertEquals("GBP", readable.scalar("select currency from ledger_transactions where id = '${first.transactionId}'"))
    assertEquals("Actual final", readable.scalar("select description from ledger_transactions where id = '${first.transactionId}'"))
    assertEquals(1, readable.scalar("select count(*) from taxonomy_transaction_assignments where transaction_id = '${first.transactionId}'")!!.toInt())
    assertEquals("resolved", readable.scalar("select status from expected_movements where id = '$expectedId'"))
    assertEquals(1, readable.scalar("select count(*) from expected_posting_attempts where expected_movement_id = '$expectedId'")!!.toInt())
    assertEquals(first.transactionId, readable.scalar("select transaction_id from workflow_tx_categorization where transaction_id = '${first.transactionId}'"))
    assertEquals("ok", readable.scalar("pragma integrity_check"))
    assertTrue(readable.rawQuery("pragma foreign_key_check", null).use { !it.moveToNext() })
    readable.close()
  }

  private fun android.database.sqlite.SQLiteDatabase.scalar(sql: String): String? = rawQuery(sql, null).use { if (it.moveToFirst() && !it.isNull(0)) it.getString(0) else null }
}
