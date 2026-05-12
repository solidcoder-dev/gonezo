package com.gonezo.preferences.application

import com.gonezo.preferences.domain.DefaultAccountId
import com.gonezo.preferences.domain.PreferencesOwnerId
import com.gonezo.preferences.domain.UserPreferences

data class GetUserPreferencesQuery(
  val ownerId: PreferencesOwnerId = PreferencesOwnerId.LOCAL_USER,
)

interface GetUserPreferencesUC {
  fun execute(query: GetUserPreferencesQuery = GetUserPreferencesQuery()): UserPreferences
}

data class SetDefaultAccountCommand(
  val ownerId: PreferencesOwnerId = PreferencesOwnerId.LOCAL_USER,
  val accountId: DefaultAccountId,
)

interface SetDefaultAccountUC {
  fun execute(command: SetDefaultAccountCommand)
}

data class ClearDefaultAccountCommand(
  val ownerId: PreferencesOwnerId = PreferencesOwnerId.LOCAL_USER,
)

interface ClearDefaultAccountUC {
  fun execute(command: ClearDefaultAccountCommand = ClearDefaultAccountCommand())
}
