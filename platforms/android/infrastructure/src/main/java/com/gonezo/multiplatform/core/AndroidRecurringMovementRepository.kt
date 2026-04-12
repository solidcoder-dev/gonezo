package com.gonezo.multiplatform.core

import android.content.ContentValues
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import com.gonezo.recurrence.domain.MonthlyPattern
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import java.math.BigDecimal
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate

internal class AndroidRecurringMovementRepository(
  private val db: CoreDatabase,
) : RecurringMovementRepository {
  override fun save(movement: RecurringMovement) {
    val values = ContentValues()
    val end = movement.recurrenceEnd
    val endKind = when (end) {
      RecurrenceEnd.Never -> "never"
      is RecurrenceEnd.OnDate -> "on_date"
      is RecurrenceEnd.AfterOccurrences -> "after_occurrences"
    }
    val endOnDate = (end as? RecurrenceEnd.OnDate)?.date?.toString()
    val endAfterOccurrences = (end as? RecurrenceEnd.AfterOccurrences)?.count

    values.put("id", movement.id.toString())
    values.put("movement_type", movement.type.value)
    values.put("source_account_id", movement.sourceAccountId)
    values.putNullable("target_account_id", movement.targetAccountId)
    values.put("amount", movement.amount.toPlainString())
    values.put("currency", movement.currency)
    values.putNullable("destination_amount", movement.destinationAmount?.toPlainString())
    values.putNullable("destination_currency", movement.destinationCurrency)
    values.putNullable("exchange_rate", movement.exchangeRate?.toPlainString())
    values.putNullable("description", movement.description)
    values.putNullable("merchant", movement.merchant)
    values.put("rule_frequency", movement.rule.frequency.value)
    values.put("rule_interval", movement.rule.interval)
    values.put("rule_weekdays", movement.rule.weeklyDays.sortedBy { it.value }.joinToString(",") { it.name })
    values.putNullableInt("rule_day_of_month", movement.rule.dayOfMonth)
    values.put("rule_monthly_pattern", movement.rule.monthlyPattern.value)
    values.putNullableInt("rule_monthly_nth", movement.rule.monthlyWeekOrdinal)
    values.putNullable("rule_monthly_weekday", movement.rule.monthlyWeekday?.name)
    values.put("end_kind", endKind)
    values.putNullable("end_on_date", endOnDate)
    values.putNullableInt("end_after_occurrences", endAfterOccurrences)
    values.put("start_at", movement.startAt.toString())
    values.put("zone_id", movement.zoneId)
    values.putNullable("next_due_at", movement.nextDueAt?.toString())
    values.put("status", movement.status.value)
    values.put("generated_occurrences", movement.generatedOccurrences)
    values.put("created_at", movement.createdAt.toString())
    values.put("updated_at", movement.updatedAt.toString())
    values.putNullable("deactivated_at", movement.deactivatedAt?.toString())
    values.putNullable("completed_at", movement.completedAt?.toString())

    val result = db.writableDatabase.insertWithOnConflict(
      "recurring_movements",
      null,
      values,
      SQLiteDatabase.CONFLICT_REPLACE,
    )
    if (result == -1L) {
      throw IllegalStateException("Failed to upsert recurring movement: ${movement.id}")
    }
  }

  override fun findById(id: RecurringMovementId): RecurringMovement? {
    val cursor = db.readableDatabase.query(
      "recurring_movements",
      COLUMNS,
      "id = ?",
      arrayOf(id.toString()),
      null,
      null,
      null,
    )
    return cursor.use { if (it.moveToFirst()) mapMovement(it) else null }
  }

  override fun findDue(now: Instant, limit: Int): List<RecurringMovement> {
    val cursor = db.readableDatabase.query(
      "recurring_movements",
      COLUMNS,
      "status = ? and next_due_at is not null and next_due_at <= ?",
      arrayOf(RecurringMovementStatus.ACTIVE.value, now.toString()),
      null,
      null,
      "next_due_at asc, id asc",
      limit.toString(),
    )
    return cursor.use(::mapMovements)
  }

  override fun listBySourceAccount(accountId: String): List<RecurringMovement> {
    val cursor = db.readableDatabase.query(
      "recurring_movements",
      COLUMNS,
      "source_account_id = ?",
      arrayOf(accountId),
      null,
      null,
      "created_at desc, id desc",
    )
    return cursor.use(::mapMovements)
  }

  private fun mapMovements(cursor: Cursor): List<RecurringMovement> {
    val items = mutableListOf<RecurringMovement>()
    while (cursor.moveToNext()) {
      items += mapMovement(cursor)
    }
    return items
  }

  private fun mapMovement(cursor: Cursor): RecurringMovement {
    val recurrenceEnd = when (cursor.string("end_kind")) {
      "never" -> RecurrenceEnd.Never
      "on_date" -> RecurrenceEnd.OnDate(
        LocalDate.parse(cursor.stringOrNull("end_on_date") ?: error("end_on_date is required")),
      )

      "after_occurrences" -> RecurrenceEnd.AfterOccurrences(
        cursor.intOrNull("end_after_occurrences") ?: error("end_after_occurrences is required"),
      )

      else -> error("Unsupported recurrence end kind: ${cursor.string("end_kind")}")
    }

    val weeklyDays = cursor.stringOrNull("rule_weekdays")
      .orEmpty()
      .split(',')
      .mapNotNull { token ->
        token.trim().takeIf { it.isNotEmpty() }?.let(DayOfWeek::valueOf)
      }
      .toSet()

    val monthlyWeekday = cursor.stringOrNull("rule_monthly_weekday")
      ?.trim()
      ?.takeIf { it.isNotEmpty() }
      ?.let(DayOfWeek::valueOf)

    val rule = RecurrenceRule(
      frequency = RecurrenceFrequency.from(cursor.string("rule_frequency")),
      interval = cursor.int("rule_interval"),
      weeklyDays = weeklyDays,
      monthlyPattern = MonthlyPattern.from(cursor.string("rule_monthly_pattern")),
      dayOfMonth = cursor.intOrNull("rule_day_of_month"),
      monthlyWeekOrdinal = cursor.intOrNull("rule_monthly_nth"),
      monthlyWeekday = monthlyWeekday,
    )

    return RecurringMovement(
      id = RecurringMovementId.from(cursor.string("id")),
      type = RecurringMovementType.from(cursor.string("movement_type")),
      sourceAccountId = cursor.string("source_account_id"),
      targetAccountId = cursor.stringOrNull("target_account_id"),
      amount = cursor.decimal("amount"),
      currency = cursor.string("currency"),
      destinationAmount = cursor.decimalOrNull("destination_amount"),
      destinationCurrency = cursor.stringOrNull("destination_currency"),
      exchangeRate = cursor.decimalOrNull("exchange_rate"),
      description = cursor.stringOrNull("description"),
      merchant = cursor.stringOrNull("merchant"),
      rule = rule,
      recurrenceEnd = recurrenceEnd,
      startAt = Instant.parse(cursor.string("start_at")),
      zoneId = cursor.string("zone_id"),
      nextDueAt = cursor.stringOrNull("next_due_at")?.let(Instant::parse),
      status = RecurringMovementStatus.from(cursor.string("status")),
      generatedOccurrences = cursor.int("generated_occurrences"),
      createdAt = Instant.parse(cursor.string("created_at")),
      updatedAt = Instant.parse(cursor.string("updated_at")),
      deactivatedAt = cursor.stringOrNull("deactivated_at")?.let(Instant::parse),
      completedAt = cursor.stringOrNull("completed_at")?.let(Instant::parse),
    )
  }

  private fun Cursor.string(column: String): String = getString(getColumnIndexOrThrow(column))

  private fun Cursor.stringOrNull(column: String): String? {
    val index = getColumnIndexOrThrow(column)
    return if (isNull(index)) null else getString(index)
  }

  private fun Cursor.int(column: String): Int = getInt(getColumnIndexOrThrow(column))

  private fun Cursor.intOrNull(column: String): Int? {
    val index = getColumnIndexOrThrow(column)
    return if (isNull(index)) null else getInt(index)
  }

  private fun Cursor.decimal(column: String): BigDecimal = BigDecimal(string(column))

  private fun Cursor.decimalOrNull(column: String): BigDecimal? = stringOrNull(column)?.let(::BigDecimal)

  private fun ContentValues.putNullable(key: String, value: String?) {
    if (value == null) {
      putNull(key)
    } else {
      put(key, value)
    }
  }

  private fun ContentValues.putNullableInt(key: String, value: Int?) {
    if (value == null) {
      putNull(key)
    } else {
      put(key, value)
    }
  }

  private companion object {
    val COLUMNS = arrayOf(
      "id",
      "movement_type",
      "source_account_id",
      "target_account_id",
      "amount",
      "currency",
      "destination_amount",
      "destination_currency",
      "exchange_rate",
      "description",
      "merchant",
      "rule_frequency",
      "rule_interval",
      "rule_weekdays",
      "rule_day_of_month",
      "rule_monthly_pattern",
      "rule_monthly_nth",
      "rule_monthly_weekday",
      "end_kind",
      "end_on_date",
      "end_after_occurrences",
      "start_at",
      "zone_id",
      "next_due_at",
      "status",
      "generated_occurrences",
      "created_at",
      "updated_at",
      "deactivated_at",
      "completed_at",
    )
  }
}

