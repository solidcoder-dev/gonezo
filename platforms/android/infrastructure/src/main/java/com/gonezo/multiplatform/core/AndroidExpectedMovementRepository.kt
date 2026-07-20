package com.gonezo.multiplatform.core

import android.content.ContentValues
import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ExpectedMovementType
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import java.math.BigDecimal
import java.time.Instant

internal class AndroidExpectedMovementRepository(private val database: CoreDatabase) : ExpectedMovementRepository {
  override fun save(movement: ExpectedMovement) {
    val values = ContentValues().apply {
      put("id", movement.id.toString()); put("account_id", movement.accountId); put("movement_type", movement.type.value)
      put("amount", movement.amount.toPlainString()); put("currency", movement.currency); put("expected_at", movement.expectedAt.toString())
      putNullable("description", movement.description); putNullable("merchant", movement.merchant); putNullable("category_id", movement.categoryId)
      putNullable("origin_occurrence_id", movement.originOccurrenceId); putNullable("origin_recurring_movement_id", movement.originRecurringMovementId)
      put("tag_names", org.json.JSONArray(movement.tagNames).toString())
      put("status", movement.status.value); putNullable("resolved_transaction_id", movement.resolvedTransactionId)
      put("created_at", movement.createdAt.toString()); put("updated_at", movement.updatedAt.toString())
      putNullable("resolved_at", movement.resolvedAt?.toString()); putNullable("dismissed_at", movement.dismissedAt?.toString())
    }
    check(database.writableDatabase.insertWithOnConflict("expected_movements", null, values, android.database.sqlite.SQLiteDatabase.CONFLICT_REPLACE) != -1L)
    database.writableDatabase.delete("expected_movement_items", "expected_movement_id = ?", arrayOf(movement.id.toString()))
    movement.splitItems.forEachIndexed { index, item ->
      database.writableDatabase.insertOrThrow("expected_movement_items", null, ContentValues().apply {
        put("id", item.id); put("expected_movement_id", movement.id.toString()); put("item_order", index); put("name", item.name)
        put("amount", item.amount.toPlainString()); putNullable("source_template_item_id", item.sourceTemplateItemId)
      })
    }
  }

  override fun findById(id: ExpectedMovementId): ExpectedMovement? = find("id = ?", arrayOf(id.toString()))
  override fun findByOriginOccurrenceId(originOccurrenceId: String): ExpectedMovement? = find("origin_occurrence_id = ?", arrayOf(originOccurrenceId))
  override fun listByAccount(accountId: String, includeClosed: Boolean): List<ExpectedMovement> = query(
    "account_id = ?" + if (includeClosed) "" else " and status = ?",
    if (includeClosed) arrayOf(accountId) else arrayOf(accountId, ExpectedMovementStatus.PENDING.value),
  )

  private fun find(selection: String, args: Array<String>): ExpectedMovement? = query(selection, args).firstOrNull()
  private fun query(selection: String, args: Array<String>): List<ExpectedMovement> {
    val cursor = database.readableDatabase.query("expected_movements", null, selection, args, null, null, "expected_at asc, id asc")
    return cursor.use {
      buildList { while (it.moveToNext()) add(mapMovement(it)) }
    }
  }

  private fun mapMovement(cursor: android.database.Cursor): ExpectedMovement {
    val id = ExpectedMovementId.from(cursor.getString(cursor.getColumnIndexOrThrow("id")))
    val itemCursor = database.readableDatabase.query("expected_movement_items", null, "expected_movement_id = ?", arrayOf(id.toString()), null, null, "item_order asc, id asc")
    val items = itemCursor.use {
      buildList { while (it.moveToNext()) add(ExpectedMovement.SplitItem(
        id = it.getString(it.getColumnIndexOrThrow("id")), name = it.getString(it.getColumnIndexOrThrow("name")),
        amount = BigDecimal(it.getString(it.getColumnIndexOrThrow("amount"))), sourceTemplateItemId = it.getString(it.getColumnIndexOrThrow("source_template_item_id")),
      )) }
    }
    fun text(name: String) = cursor.getString(cursor.getColumnIndexOrThrow(name))
    fun instant(name: String) = text(name).let(Instant::parse)
    return ExpectedMovement(
      id, text("account_id"), ExpectedMovementType.from(text("movement_type")), BigDecimal(text("amount")), text("currency"), instant("expected_at"),
      text("description"), text("merchant"), text("category_id"), text("origin_occurrence_id"), text("origin_recurring_movement_id"), items,
      ExpectedMovementStatus.from(text("status")), text("resolved_transaction_id"), instant("created_at"), instant("updated_at"),
      text("resolved_at")?.let(Instant::parse), text("dismissed_at")?.let(Instant::parse), decodeTags(cursor.getString(cursor.getColumnIndexOrThrow("tag_names"))),
    )
  }

  private fun decodeTags(raw: String?): List<String> {
    if (raw.isNullOrBlank()) return emptyList()
    val json = org.json.JSONArray(raw)
    return buildList { for (index in 0 until json.length()) add(json.getString(index)) }
  }

  private fun ContentValues.putNullable(key: String, value: String?) { if (value == null) putNull(key) else put(key, value) }
}
