package com.gonezo.multiplatform.core

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import com.gonezo.preferences.domain.DefaultAccountId
import com.gonezo.preferences.domain.PreferencesOwnerId
import com.gonezo.preferences.domain.UserPreferences
import com.gonezo.preferences.domain.ports.UserPreferencesRepository
import java.time.Instant

internal class AndroidUserPreferencesRepository(
  private val db: CoreDatabase,
) : UserPreferencesRepository {
  override fun save(preferences: UserPreferences) {
    val values = ContentValues().apply {
      put("owner_id", preferences.ownerId.value)
      val defaultAccountId = preferences.defaultAccountId
      if (defaultAccountId == null) {
        putNull("default_account_id")
      } else {
        put("default_account_id", defaultAccountId.value)
      }
      put("updated_at", Instant.now().toString())
    }

    val result = db.writableDatabase.insertWithOnConflict(
      "user_preferences",
      null,
      values,
      SQLiteDatabase.CONFLICT_REPLACE,
    )
    check(result != -1L) { "Failed to upsert user preferences: ${preferences.ownerId}" }
  }

  override fun findByOwnerId(ownerId: PreferencesOwnerId): UserPreferences? {
    val cursor = db.readableDatabase.query(
      "user_preferences",
      arrayOf("owner_id", "default_account_id"),
      "owner_id = ?",
      arrayOf(ownerId.value),
      null,
      null,
      null,
    )

    return cursor.use {
      if (!it.moveToFirst()) {
        null
      } else {
        val defaultAccountIdRaw = it.getString(1)
        UserPreferences(
          ownerId = PreferencesOwnerId.from(it.getString(0)),
          defaultAccountId = defaultAccountIdRaw?.let(DefaultAccountId::from),
        )
      }
    }
  }
}
