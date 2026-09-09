package com.gonezo.multiplatform.core

import com.gonezo.notifications.application.NotificationQueries
import com.gonezo.notifications.application.NotificationsListQuery
import com.getcapacitor.JSObject
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

class AndroidNotificationsCore private constructor(private val queries: NotificationQueries) {
  fun list(filter: String, beforeCursor: String?, limit: Int): JSObject = queries
    .notificationsList("local-user", NotificationsListQuery(filter, beforeCursor, limit))
    .let { result ->
      JSObject().apply {
        put("items", JSONArray().apply { result.items.forEach { item -> put(itemJson(item)) } })
        putNullable("nextCursor", result.nextCursor)
        putNullable("snapshotCursor", result.snapshotCursor)
      }
    }

  fun countUnread(): JSObject = JSObject().put("count", queries.notificationsCountUnread("local-user"))

  fun markRead(id: String): JSObject = commandJson(queries.notificationsMarkRead("local-user", id, Instant.now()))

  fun markAllRead(cursor: String): JSObject = JSObject().put(
    "updated",
    queries.notificationsMarkAllRead("local-user", cursor, Instant.now()),
  )

  private fun commandJson(result: com.gonezo.notifications.application.NotificationCommandResult): JSObject = when (result) {
    com.gonezo.notifications.application.NotificationCommandResult.NotFound -> JSObject().put("found", false)
    is com.gonezo.notifications.application.NotificationCommandResult.Found -> JSObject()
      .put("found", true)
      .put("item", itemJson(result.item))
  }

  private fun itemJson(item: com.gonezo.notifications.application.NotificationItem): JSObject = JSObject().apply {
    put("id", item.id); put("type", item.type); put("sourceType", item.sourceType); put("sourceId", item.sourceId)
    put("subject", item.subject); putNullable("errorCode", item.errorCode)
    put("occurredAt", item.occurredAt.toString()); put("createdAt", item.createdAt.toString())
    putNullable("readAt", item.readAt?.toString()); putNullable("withdrawnAt", item.withdrawnAt?.toString())
  }

  private fun JSObject.putNullable(key: String, value: String?) { put(key, value ?: JSONObject.NULL) }

  companion object {
    @JvmStatic
    fun create(context: android.content.Context): AndroidNotificationsCore = AndroidNotificationsCore(
      NotificationQueries(AndroidNotificationRepository(CoreDatabase(context.applicationContext))),
    )
  }
}
