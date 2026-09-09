package com.gonezo.multiplatform.core

import android.content.ContentValues
import com.gonezo.notifications.application.NotificationListFilter
import com.gonezo.notifications.application.NotificationLookupResult
import com.gonezo.notifications.application.NotificationPage
import com.gonezo.notifications.application.NotificationRepository
import com.gonezo.notifications.application.NotificationRow
import com.gonezo.notifications.application.NotificationWriteResult
import com.gonezo.notifications.domain.Notification
import com.gonezo.notifications.domain.NotificationId
import com.gonezo.notifications.domain.NotificationSourceType
import com.gonezo.notifications.domain.NotificationType
import java.time.Instant

internal class AndroidNotificationRepository(private val database: CoreDatabase) : NotificationRepository {
  override fun snapshotSequence(ownerId: String): Long? = database.readableDatabase.query(
    "notifications",
    arrayOf("max(sequence)"),
    "owner_id = ?",
    arrayOf(ownerId),
    null,
    null,
    null,
  ).use { cursor -> if (cursor.moveToFirst() && !cursor.isNull(0)) cursor.getLong(0) else null }

  override fun createIfAbsent(notification: Notification): NotificationWriteResult {
    val inserted = database.writableDatabase.insertWithOnConflict(
      "notifications",
      null,
      notification.values(),
      android.database.sqlite.SQLiteDatabase.CONFLICT_IGNORE,
    ) != -1L
    val row = findByDeduplicationKey(notification.ownerId, notification.deduplicationKey)
      ?: error("Notification insert did not produce a row")
    return if (inserted) NotificationWriteResult.Created(row) else NotificationWriteResult.Existing(row)
  }

  override fun findById(ownerId: String, notificationId: String): NotificationLookupResult = find(
    "owner_id = ? and id = ?",
    arrayOf(ownerId, notificationId),
  )

  override fun list(ownerId: String, filter: NotificationListFilter, beforeSequence: Long?, limit: Int): NotificationPage {
    require(limit > 0) { "limit must be greater than 0" }
    val clauses = mutableListOf("owner_id = ?")
    val args = mutableListOf(ownerId)
    if (filter == NotificationListFilter.UNREAD) {
      clauses += "read_at is null and withdrawn_at is null"
    }
    if (beforeSequence != null) {
      clauses += "sequence < ?"
      args += beforeSequence.toString()
    }
    val cursor = database.readableDatabase.query(
      "notifications",
      null,
      clauses.joinToString(" and "),
      args.toTypedArray(),
      null,
      null,
      "sequence desc",
      limit.toString(),
    )
    val rows = cursor.use { buildList { while (it.moveToNext()) add(mapRow(it)) } }
    return NotificationPage(rows, rows.lastOrNull()?.sequence?.takeIf { rows.size == limit })
  }

  override fun countUnread(ownerId: String): Int = database.readableDatabase.query(
    "notifications",
    arrayOf("sequence"),
    "owner_id = ? and read_at is null and withdrawn_at is null",
    arrayOf(ownerId),
    null,
    null,
    null,
  ).use { it.count }

  override fun markRead(ownerId: String, notificationId: String, at: Instant): NotificationLookupResult {
    database.writableDatabase.execSQL(
      "update notifications set read_at = coalesce(read_at, ?) where owner_id = ? and id = ?",
      arrayOf(at.toString(), ownerId, notificationId),
    )
    return findById(ownerId, notificationId)
  }

  override fun markAllRead(ownerId: String, throughSequence: Long, at: Instant): Int {
    val values = ContentValues().apply { put("read_at", at.toString()) }
    return database.writableDatabase.update(
      "notifications",
      values,
      "owner_id = ? and sequence <= ? and read_at is null",
      arrayOf(ownerId, throughSequence.toString()),
    )
  }

  override fun withdrawBySource(ownerId: String, sourceType: NotificationSourceType, sourceId: String, at: Instant): Int {
    val values = ContentValues().apply { put("withdrawn_at", at.toString()) }
    return database.writableDatabase.update(
      "notifications",
      values,
      "owner_id = ? and source_type = ? and source_id = ? and withdrawn_at is null",
      arrayOf(ownerId, sourceType.value, sourceId),
    )
  }

  override fun withdraw(ownerId: String, notificationId: String, at: Instant): NotificationLookupResult {
    val values = ContentValues().apply { put("withdrawn_at", at.toString()) }
    database.writableDatabase.update("notifications", values, "owner_id = ? and id = ?", arrayOf(ownerId, notificationId))
    return findById(ownerId, notificationId)
  }

  private fun findByDeduplicationKey(ownerId: String, deduplicationKey: String): NotificationRow? = find(
    "owner_id = ? and deduplication_key = ?",
    arrayOf(ownerId, deduplicationKey),
  ).let { (it as? NotificationLookupResult.Found)?.row }

  private fun find(selection: String, args: Array<String>): NotificationLookupResult {
    val cursor = database.readableDatabase.query("notifications", null, selection, args, null, null, null, "1")
    return cursor.use { if (it.moveToFirst()) NotificationLookupResult.Found(mapRow(it)) else NotificationLookupResult.NotFound }
  }

  private fun mapRow(cursor: android.database.Cursor): NotificationRow = NotificationRow(
    sequence = cursor.getLong(cursor.getColumnIndexOrThrow("sequence")),
    notification = Notification.rehydrate(
      id = NotificationId.from(cursor.text("id")),
      ownerId = cursor.text("owner_id"),
      type = NotificationType.from(cursor.text("type")),
      deduplicationKey = cursor.text("deduplication_key"),
      sourceType = NotificationSourceType.from(cursor.text("source_type")),
      sourceId = cursor.text("source_id"),
      originOccurrenceId = cursor.text("origin_occurrence_id"),
      subject = cursor.text("subject"),
      errorCode = cursor.getString(cursor.getColumnIndexOrThrow("error_code")),
      occurredAt = Instant.parse(cursor.text("occurred_at")),
      createdAt = Instant.parse(cursor.text("created_at")),
      readAt = cursor.getString(cursor.getColumnIndexOrThrow("read_at"))?.let(Instant::parse),
      withdrawnAt = cursor.getString(cursor.getColumnIndexOrThrow("withdrawn_at"))?.let(Instant::parse),
    ),
  )

  private fun Notification.values() = ContentValues().apply {
    put("id", id.toString()); put("owner_id", ownerId); put("type", type.value)
    put("deduplication_key", deduplicationKey); put("source_type", sourceType.value); put("source_id", sourceId)
    put("origin_occurrence_id", originOccurrenceId); put("subject", subject); putNullable("error_code", errorCode)
    put("occurred_at", occurredAt.toString()); put("created_at", createdAt.toString())
  }

  private fun ContentValues.putNullable(key: String, value: String?) { if (value == null) putNull(key) else put(key, value) }
  private fun android.database.Cursor.text(column: String): String = getString(getColumnIndexOrThrow(column))
}
