package com.gonezo.multiplatform.core

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import com.gonezo.ledger.domain.AccountId
import java.math.BigDecimal
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeParseException
import java.util.Locale
import java.util.UUID
import org.json.JSONArray

class AndroidExpectedCore internal constructor(
  private val database: CoreDatabase,
  private val accountExists: (String) -> Boolean,
  private val clock: Clock,
) {
  fun createMovement(
    accountId: String?,
    type: String?,
    amount: String?,
    currency: String?,
    expectedAt: String?,
    description: String?,
    merchant: String?,
    categoryId: String?,
    originOccurrenceId: String? = null,
    originRecurringMovementId: String? = null,
    splitItemsJson: String? = null,
  ): UUID {
    val resolvedAccountId = requireText(accountId, "accountId is required")
    if (!accountExists(resolvedAccountId)) {
      throw IllegalArgumentException("Account not found")
    }

    val resolvedType = requireText(type, "type is required").lowercase(Locale.ROOT)
    if (resolvedType != "expense" && resolvedType != "income") {
      throw IllegalArgumentException("type must be expense or income")
    }

    val now = Instant.now(clock)
    val id = UUID.randomUUID()
    val values = ContentValues()
    values.put("id", id.toString())
    values.put("account_id", resolvedAccountId)
    values.put("movement_type", resolvedType)
    values.put("amount", parsePositiveDecimal(requireText(amount, "amount is required")).toPlainString())
    values.put("currency", requireCurrency(currency))
    values.put(
      "expected_at",
      if (expectedAt.isNullOrBlank()) now.toString() else parseInstantOrDate(expectedAt, "expectedAt").toString(),
    )
    putNullable(values, "description", description)
    putNullable(values, "merchant", merchant)
    putNullable(values, "category_id", categoryId)
    putNullable(values, "origin_occurrence_id", originOccurrenceId)
    putNullable(values, "origin_recurring_movement_id", originRecurringMovementId)
    values.put("status", "pending")
    values.putNull("resolved_transaction_id")
    values.put("created_at", now.toString())
    values.put("updated_at", now.toString())
    values.putNull("resolved_at")
    values.putNull("dismissed_at")

    val inserted = database.writableDatabase.insertWithOnConflict(
      "expected_movements",
      null,
      values,
      SQLiteDatabase.CONFLICT_ABORT,
    )
    if (inserted == -1L) {
      throw IllegalStateException("Failed to create expected movement")
    }
    replaceSplitItems(id.toString(), parseSplitItems(splitItemsJson))
    return id
  }

  fun updateMovement(
    expectedMovementId: String?,
    accountId: String?,
    type: String?,
    amount: String?,
    currency: String?,
    expectedAt: String?,
    description: String?,
    merchant: String?,
    categoryId: String?,
    splitItemsJson: String? = null,
  ): UUID {
    val id = requireText(expectedMovementId, "expectedMovementId is required")
    val resolvedAccountId = requireText(accountId, "accountId is required")
    if (!accountExists(resolvedAccountId)) {
      throw IllegalArgumentException("Account not found")
    }

    val resolvedType = requireText(type, "type is required").lowercase(Locale.ROOT)
    if (resolvedType != "expense" && resolvedType != "income") {
      throw IllegalArgumentException("type must be expense or income")
    }

    ensurePendingMovement(id)

    val now = Instant.now(clock)
    val values = ContentValues()
    values.put("account_id", resolvedAccountId)
    values.put("movement_type", resolvedType)
    values.put("amount", parsePositiveDecimal(requireText(amount, "amount is required")).toPlainString())
    values.put("currency", requireCurrency(currency))
    values.put(
      "expected_at",
      if (expectedAt.isNullOrBlank()) now.toString() else parseInstantOrDate(expectedAt, "expectedAt").toString(),
    )
    putNullable(values, "description", description)
    putNullable(values, "merchant", merchant)
    putNullable(values, "category_id", categoryId)
    values.put("updated_at", now.toString())

    val updated = database.writableDatabase.update(
      "expected_movements",
      values,
      "id = ?",
      arrayOf(id),
    )
    if (updated == 0) {
      throw IllegalStateException("Expected movement not found: $id")
    }

    replaceSplitItems(id, parseSplitItems(splitItemsJson))
    return UUID.fromString(id)
  }

  fun listMovements(accountId: String?, includeClosed: Boolean): List<ExpectedMovementView> {
    val resolvedAccountId = requireText(accountId, "accountId is required")
    val selection = if (includeClosed) {
      "account_id = ?"
    } else {
      "account_id = ? and status = ?"
    }
    val selectionArgs = if (includeClosed) {
      arrayOf(resolvedAccountId)
    } else {
      arrayOf(resolvedAccountId, "pending")
    }

    val cursor = database.readableDatabase.query(
      "expected_movements",
      EXPECTED_COLUMNS,
      selection,
      selectionArgs,
      null,
      null,
      "expected_at asc, id asc",
    )
    return cursor.use(::readExpectedMovements)
  }

  fun resolveMovement(expectedMovementId: String?, transactionId: String?, resolvedAt: String?) {
    val id = requireText(expectedMovementId, "expectedMovementId is required")
    val resolvedTransactionId = requireText(transactionId, "transactionId is required")
    ensurePendingMovement(id)
    val at = if (resolvedAt.isNullOrBlank()) Instant.now(clock) else parseInstantOrDate(resolvedAt, "resolvedAt")

    val values = ContentValues()
    values.put("status", "resolved")
    values.put("resolved_transaction_id", resolvedTransactionId)
    values.put("updated_at", at.toString())
    values.put("resolved_at", at.toString())
    values.putNull("dismissed_at")
    updateMovement(id, values)
  }

  fun dismissMovement(expectedMovementId: String?, dismissedAt: String?) {
    val id = requireText(expectedMovementId, "expectedMovementId is required")
    ensurePendingMovement(id)
    val at = if (dismissedAt.isNullOrBlank()) Instant.now(clock) else parseInstantOrDate(dismissedAt, "dismissedAt")

    val values = ContentValues()
    values.put("status", "dismissed")
    values.putNull("resolved_transaction_id")
    values.put("updated_at", at.toString())
    values.putNull("resolved_at")
    values.put("dismissed_at", at.toString())
    updateMovement(id, values)
  }

  private fun ensurePendingMovement(id: String) {
    val cursor = database.readableDatabase.query(
      "expected_movements",
      arrayOf("status"),
      "id = ?",
      arrayOf(id),
      null,
      null,
      null,
    )
    cursor.use {
      if (!it.moveToFirst()) {
        throw IllegalStateException("Expected movement not found: $id")
      }
      if (!"pending".equals(it.getString(0), ignoreCase = true)) {
        throw IllegalStateException("Only pending expected movements can be changed")
      }
    }
  }

  private fun updateMovement(id: String, values: ContentValues) {
    val updated = database.writableDatabase.update(
      "expected_movements",
      values,
      "id = ?",
      arrayOf(id),
    )
    if (updated == 0) {
      throw IllegalStateException("Expected movement not found: $id")
    }
  }

  private fun replaceSplitItems(expectedMovementId: String, splitItems: List<SplitItemInput>) {
    database.writableDatabase.delete("expected_movement_items", "expected_movement_id = ?", arrayOf(expectedMovementId))
    splitItems.forEachIndexed { index, item ->
      val itemValues = ContentValues()
      itemValues.put("id", item.id)
      itemValues.put("expected_movement_id", expectedMovementId)
      itemValues.put("item_order", index)
      itemValues.put("name", item.name)
      itemValues.put("amount", item.amount)
      if (database.writableDatabase.insertWithOnConflict(
          "expected_movement_items",
          null,
          itemValues,
          SQLiteDatabase.CONFLICT_ABORT,
        ) == -1L
      ) {
        throw IllegalStateException("Failed to create expected movement split item")
      }
    }
  }

  private fun readExpectedMovements(cursor: Cursor): List<ExpectedMovementView> {
    val items = mutableListOf<ExpectedMovementView>()
    while (cursor.moveToNext()) {
      val movementId = cursor.getString(0)
      items.add(
        ExpectedMovementView(
          id = movementId,
          accountId = cursor.getString(1),
          type = cursor.getString(2),
          amount = cursor.getString(3),
          currency = cursor.getString(4),
          expectedAt = cursor.getString(5),
          description = cursor.getStringOrNull(6),
          merchant = cursor.getStringOrNull(7),
          categoryId = cursor.getStringOrNull(8),
          originOccurrenceId = cursor.getStringOrNull(9),
          originRecurringMovementId = cursor.getStringOrNull(10),
          status = cursor.getString(11),
          resolvedTransactionId = cursor.getStringOrNull(12),
          createdAt = cursor.getString(13),
          updatedAt = cursor.getString(14),
          resolvedAt = cursor.getStringOrNull(15),
          dismissedAt = cursor.getStringOrNull(16),
          splitItems = loadSplitItems(movementId),
        ),
      )
    }
    return items
  }

  private fun parsePositiveDecimal(value: String): BigDecimal {
    val parsed = value.trim().toBigDecimalOrNull()
      ?: throw IllegalArgumentException("amount must be greater than 0")
    if (parsed <= BigDecimal.ZERO) {
      throw IllegalArgumentException("amount must be greater than 0")
    }
    return parsed
  }

  private fun parseInstantOrDate(rawValue: String, fieldName: String): Instant {
    val value = requireText(rawValue, "$fieldName is required")
    return try {
      Instant.parse(value)
    } catch (_: DateTimeParseException) {
      try {
        LocalDateTime.parse(value).toInstant(ZoneOffset.UTC)
      } catch (_: DateTimeParseException) {
        try {
          LocalDate.parse(value).atStartOfDay().toInstant(ZoneOffset.UTC)
        } catch (_: DateTimeParseException) {
          throw IllegalArgumentException("$fieldName must be an ISO-8601 datetime or date")
        }
      }
    }
  }

  private fun requireCurrency(value: String?): String {
    val currency = requireText(value, "currency is required").uppercase(Locale.ROOT)
    if (!Regex("^[A-Z]{3}$").matches(currency)) {
      throw IllegalArgumentException("currency must be 3 uppercase letters")
    }
    return currency
  }

  private fun requireText(value: String?, message: String): String {
    val trimmed = value?.trim()
    if (trimmed.isNullOrEmpty()) {
      throw IllegalArgumentException(message)
    }
    return trimmed
  }

  private fun putNullable(values: ContentValues, key: String, value: String?) {
    val normalized = value?.trim()?.ifBlank { null }
    if (normalized == null) {
      values.putNull(key)
    } else {
      values.put(key, normalized)
    }
  }

  private fun Cursor.getStringOrNull(index: Int): String? =
    if (isNull(index)) null else getString(index)

  private fun parseSplitItems(splitItemsJson: String?): List<SplitItemInput> {
    val raw = splitItemsJson?.trim().orEmpty()
    if (raw.isEmpty()) {
      return emptyList()
    }
    val parsed = JSONArray(raw)
    val items = mutableListOf<SplitItemInput>()
    for (index in 0 until parsed.length()) {
      val item = parsed.getJSONObject(index)
      items.add(
        SplitItemInput(
          id = requireText(item.getString("id"), "split item id is required"),
          name = requireText(item.getString("name"), "split item name is required"),
          amount = requireText(item.getString("amount"), "split item amount is required"),
        ),
      )
    }
    return items
  }

  private fun loadSplitItems(expectedMovementId: String): List<SplitItem> {
    val cursor = database.readableDatabase.query(
      "expected_movement_items",
      arrayOf("id", "name", "amount"),
      "expected_movement_id = ?",
      arrayOf(expectedMovementId),
      null,
      null,
      "item_order asc, id asc",
    )
    return cursor.use {
      val items = mutableListOf<SplitItem>()
      while (it.moveToNext()) {
        items.add(
          SplitItem(
            id = it.getString(0),
            name = it.getString(1),
            amount = it.getString(2),
          ),
        )
      }
      items
    }
  }

  data class ExpectedMovementView(
    val id: String,
    val accountId: String,
    val type: String,
    val amount: String,
    val currency: String,
    val expectedAt: String,
    val description: String?,
    val merchant: String?,
    val categoryId: String?,
    val originOccurrenceId: String?,
    val originRecurringMovementId: String?,
    val status: String,
    val resolvedTransactionId: String?,
    val createdAt: String,
    val updatedAt: String,
    val resolvedAt: String?,
    val dismissedAt: String?,
    val splitItems: List<SplitItem>,
  )

  data class SplitItem(
    val id: String,
    val name: String,
    val amount: String,
  )

  data class SplitItemInput(
    val id: String,
    val name: String,
    val amount: String,
  )

  companion object {
    private val EXPECTED_COLUMNS = arrayOf(
      "id",
      "account_id",
      "movement_type",
      "amount",
      "currency",
      "expected_at",
      "description",
      "merchant",
      "category_id",
      "origin_occurrence_id",
      "origin_recurring_movement_id",
      "status",
      "resolved_transaction_id",
      "created_at",
      "updated_at",
      "resolved_at",
      "dismissed_at",
    )

    @Volatile
    private var instance: AndroidExpectedCore? = null

    @JvmStatic
    fun getInstance(context: Context): AndroidExpectedCore {
      val existing = instance
      if (existing != null) {
        return existing
      }
      return synchronized(this) {
        val synchronizedExisting = instance
        if (synchronizedExisting != null) {
          synchronizedExisting
        } else {
          val database = CoreDatabase(context.applicationContext)
          val accountRepository = AndroidLedgerAccountRepository(database)
          AndroidExpectedCore(
            database = database,
            accountExists = { accountId ->
              val uuid = runCatching { UUID.fromString(accountId.trim()) }.getOrNull()
              uuid != null && accountRepository.exists(AccountId(uuid))
            },
            clock = Clock.systemUTC(),
          ).also { created -> instance = created }
        }
      }
    }
  }
}
