package com.gonezo.multiplatform.core

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CoreDatabaseFreshInstallTest {
  @Test
  fun createsCategorizationWorkflowTableAndIndexWithProductionSchema() {
    val database = CoreDatabase(ApplicationProvider.getApplicationContext(), "gonezo-fresh-${System.nanoTime()}.db")
    val sqlite = database.writableDatabase

    assertEquals(30, sqlite.version)
    assertEquals("table", sqlite.scalar("select type from sqlite_master where name = 'workflow_tx_categorization'"))
    assertEquals("index", sqlite.scalar("select type from sqlite_master where name = 'idx_workflow_tx_categorization_status_next_attempt'"))
    assertEquals(
      listOf(
        listOf("transaction_id", "1", "", "1"),
        listOf("requested_category_id", "0", "", "0"),
        listOf("status", "1", "", "0"),
        listOf("error_code", "0", "", "0"),
        listOf("error_message", "0", "", "0"),
        listOf("attempts", "1", "", "0"),
        listOf("next_attempt_at", "0", "", "0"),
        listOf("updated_at", "1", "", "0"),
        listOf("created_at", "1", "", "0"),
      ),
      sqlite.tableInfo("workflow_tx_categorization"),
    )
    assertEquals("ok", sqlite.scalar("pragma integrity_check"))
    assertTrue(sqlite.rawQuery("pragma foreign_key_check", null).use { !it.moveToNext() })
    database.close()
  }

  private fun android.database.sqlite.SQLiteDatabase.scalar(sql: String): String? = rawQuery(sql, null).use { if (it.moveToFirst() && !it.isNull(0)) it.getString(0) else null }

  private fun android.database.sqlite.SQLiteDatabase.tableInfo(table: String): List<List<String>> = rawQuery("pragma table_info($table)", null).use { cursor ->
    buildList { while (cursor.moveToNext()) add(listOf(cursor.getString(1), cursor.getString(3), cursor.getString(4) ?: "", cursor.getString(5))) }
  }
}
