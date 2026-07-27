package com.gonezo.multiplatform.core

import com.gonezo.application.query.AnalyticsExclusionKey
import com.gonezo.application.query.AnalyticsExclusionKeyResolver
import com.gonezo.application.query.AnalyticsExclusionReader
import com.gonezo.application.query.AnalyticsMovementReference

internal class AndroidAnalyticsExclusionReader(
  private val database: CoreDatabase,
) : AnalyticsExclusionReader {
  override fun readIgnored(references: Collection<AnalyticsMovementReference>): Set<AnalyticsExclusionKey> {
    val keys = references.mapNotNull(AnalyticsExclusionKeyResolver::resolve).distinct()
    if (keys.isEmpty()) return emptySet()

    return keys.groupBy(AnalyticsExclusionKey::scopeType).flatMapTo(mutableSetOf()) { (scopeType, scopedKeys) ->
      scopedKeys.chunked(900).flatMap { chunk ->
        val placeholders = chunk.joinToString(",") { "?" }
        val args = arrayOf(scopeType, "user_ignored", *chunk.map(AnalyticsExclusionKey::scopeId).toTypedArray())
        database.readableDatabase.query(
          "analytics_exclusions",
          arrayOf("scope_type", "scope_id"),
          "scope_type = ? and reason = ? and scope_id in ($placeholders)",
          args,
          null,
          null,
          null,
        ).use { cursor ->
          buildList {
            while (cursor.moveToNext()) {
              add(AnalyticsExclusionKey(cursor.getString(0), cursor.getString(1)))
            }
          }
        }
      }
    }
  }
}
