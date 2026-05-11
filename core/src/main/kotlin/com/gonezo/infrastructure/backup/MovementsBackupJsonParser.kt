package com.gonezo.infrastructure.backup

import com.gonezo.application.orchestration.backup.BackupAccount
import com.gonezo.application.orchestration.backup.BackupCategory
import com.gonezo.application.orchestration.backup.BackupPostedMovement
import com.gonezo.application.orchestration.backup.BackupSplitItem
import com.gonezo.application.orchestration.backup.BackupTag
import com.gonezo.application.orchestration.backup.MovementsBackupSnapshot
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

class MovementsBackupJsonParser {
  fun parse(json: String): MovementsBackupSnapshot {
    val root = JSONObject(json)
    val schemaVersion = root.optInt("schemaVersion", -1)
    require(schemaVersion > 0) { "schemaVersion is required" }

    return MovementsBackupSnapshot(
      schemaVersion = schemaVersion,
      exportedAt = root.stringOrNull("exportedAt")?.let(Instant::parse),
      accounts = root.optJSONArray("accounts").orEmpty().mapObjects { item ->
        BackupAccount(
          id = item.getString("id"),
          name = item.getString("name"),
          type = item.optString("type", "cash"),
          currency = item.getString("currency"),
          status = item.optString("status", "active"),
        )
      },
      categories = root.optJSONArray("categories").orEmpty().mapObjects { item ->
        BackupCategory(
          id = item.getString("id"),
          name = item.getString("name"),
          appliesTo = item.getString("appliesTo"),
          status = item.optString("status", "active"),
        )
      },
      tags = root.optJSONArray("tags").orEmpty().mapObjects { item ->
        BackupTag(
          id = item.getString("id"),
          name = item.getString("name"),
          status = item.optString("status", "active"),
        )
      },
      postedMovements = root.optJSONArray("postedMovements").orEmpty().mapObjects { item ->
        val currency = item.getString("currency")
        BackupPostedMovement(
          id = item.getString("id"),
          accountId = item.getString("accountId"),
          type = item.getString("type"),
          status = item.optString("status", "posted"),
          occurredAt = Instant.parse(item.getString("occurredAt")),
          amount = item.getString("amount"),
          currency = currency,
          description = item.stringOrNull("description"),
          merchant = item.stringOrNull("merchant"),
          categoryId = item.stringOrNull("categoryId") ?: item.optJSONObject("category")?.stringOrNull("id"),
          linkedTransactionId = item.stringOrNull("linkedTransactionId"),
          splitItems = item.optJSONArray("splitItems").orEmpty().mapObjects { split ->
            BackupSplitItem(
              id = split.getString("id"),
              name = split.getString("name"),
              amount = split.getString("amount"),
              currency = split.stringOrNull("currency") ?: currency,
              note = split.stringOrNull("note"),
            )
          },
          tagIds = item.optJSONArray("tagIds").orEmpty().mapStrings(),
        )
      },
    )
  }

  private fun JSONArray?.orEmpty(): JSONArray = this ?: JSONArray()

  private fun <T> JSONArray.mapObjects(transform: (JSONObject) -> T): List<T> =
    (0 until length()).map { index -> transform(getJSONObject(index)) }

  private fun JSONArray.mapStrings(): List<String> =
    (0 until length()).mapNotNull { index -> optString(index).trim().ifBlank { null } }

  private fun JSONObject.stringOrNull(name: String): String? {
    if (!has(name) || isNull(name)) {
      return null
    }
    return optString(name).trim().ifBlank { null }
  }
}
