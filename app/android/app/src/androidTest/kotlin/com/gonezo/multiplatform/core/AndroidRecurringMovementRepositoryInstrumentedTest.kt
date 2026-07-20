package com.gonezo.multiplatform.core

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.gonezo.recurrence.domain.MonthlyPattern
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class AndroidRecurringMovementRepositoryInstrumentedTest {
  @Test
  fun savesAndListsRecurringMovementTagsThroughTheProductionProjection() {
    val database = CoreDatabase(ApplicationProvider.getApplicationContext(), TEST_DATABASE_NAME)
    val repository = AndroidRecurringMovementRepository(database)
    val movement = recurringMovement(listOf("food", "monthly"))

    repository.save(movement)

    assertEquals(listOf("food", "monthly"), repository.listBySourceAccount("account-1").single().tagNames)
  }

  @Test
  fun preservesRecurringMovementTagsAcrossFindByIdAndDashboardList() {
    val database = CoreDatabase(ApplicationProvider.getApplicationContext(), TEST_DATABASE_NAME)
    val repository = AndroidRecurringMovementRepository(database)
    val movement = recurringMovement(listOf("food", "monthly"))

    repository.save(movement)

    assertEquals(movement.tagNames, repository.findById(movement.id)?.tagNames)
    assertEquals(movement.tagNames, repository.listBySourceAccount(movement.sourceAccountId).single().tagNames)
  }

  @Test
  fun addsTagColumnsWithoutChangingExistingRows() {
    val database = SQLiteDatabase.create(null)
    database.execSQL("create table recurring_movements (id text primary key, amount text not null)")
    database.execSQL("create table expected_movements (id text primary key, amount text not null)")
    database.insertOrThrow("recurring_movements", null, ContentValues().apply {
      put("id", "recurring-existing")
      put("amount", "42.50")
    })
    database.insertOrThrow("expected_movements", null, ContentValues().apply {
      put("id", "expected-existing")
      put("amount", "17.25")
    })

    CoreDatabase(ApplicationProvider.getApplicationContext(), TEST_DATABASE_NAME)
      .onUpgrade(database, 28, 29)

    assertEquals("42.50", database.scalar("select amount from recurring_movements where id = 'recurring-existing'"))
    assertEquals("17.25", database.scalar("select amount from expected_movements where id = 'expected-existing'"))
    assertEquals("[]", database.scalar("select tag_names from recurring_movements where id = 'recurring-existing'"))
    assertEquals("[]", database.scalar("select tag_names from expected_movements where id = 'expected-existing'"))
    assertTrue(database.hasColumn("recurring_movements", "tag_names"))
    assertTrue(database.hasColumn("expected_movements", "tag_names"))
    database.close()
  }

  @Test(expected = android.database.sqlite.SQLiteException::class)
  fun migrationDoesNotSuppressMissingTableErrors() {
    val database = SQLiteDatabase.create(null)
    database.execSQL("create table recurring_movements (id text primary key)")

    CoreDatabase(ApplicationProvider.getApplicationContext(), TEST_DATABASE_NAME)
      .onUpgrade(database, 28, 29)
  }

  private fun recurringMovement(tags: List<String>): RecurringMovement = RecurringMovement.create(
    id = RecurringMovementId.from(UUID.fromString("11111111-1111-1111-1111-111111111111").toString()),
    type = com.gonezo.recurrence.domain.RecurringMovementType.EXPENSE,
    sourceAccountId = "account-1",
    targetAccountId = null,
    amount = BigDecimal("42.50"),
    currency = "USD",
    destinationAmount = null,
    destinationCurrency = null,
    exchangeRate = null,
    description = "Groceries",
    merchant = "Market",
    categoryId = "category-food",
    tagNames = tags,
    rule = RecurrenceRule(RecurrenceFrequency.MONTHLY, monthlyPattern = MonthlyPattern.DAY_OF_MONTH, dayOfMonth = 1),
    recurrenceEnd = RecurrenceEnd.Never,
    startAt = Instant.parse("2026-07-01T10:00:00Z"),
    zoneId = "UTC",
    createdAt = Instant.parse("2026-06-01T10:00:00Z"),
    scheduleCalculator = RecurrenceScheduleCalculator(),
  )

  private fun SQLiteDatabase.scalar(sql: String): String? = rawQuery(sql, null).use {
    if (it.moveToFirst() && !it.isNull(0)) it.getString(0) else null
  }

  private fun SQLiteDatabase.hasColumn(table: String, column: String): Boolean = rawQuery(
    "pragma table_info($table)",
    null,
  ).use { cursor ->
    buildList {
      while (cursor.moveToNext()) add(cursor.getString(cursor.getColumnIndexOrThrow("name")))
    }.contains(column)
  }

  private companion object {
    const val TEST_DATABASE_NAME = "gonezo-recurring-movement-regression.db"
  }
}
