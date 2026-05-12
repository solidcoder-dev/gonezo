package com.gonezo.preferences.domain.ports

import com.gonezo.preferences.domain.PreferencesOwnerId
import com.gonezo.preferences.domain.UserPreferences

interface UserPreferencesRepository {
  fun save(preferences: UserPreferences)

  fun findByOwnerId(ownerId: PreferencesOwnerId): UserPreferences?
}
