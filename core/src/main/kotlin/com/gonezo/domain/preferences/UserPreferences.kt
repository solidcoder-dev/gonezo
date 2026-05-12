package com.gonezo.preferences.domain

data class UserPreferences(
  val ownerId: PreferencesOwnerId,
  val defaultAccountId: DefaultAccountId?,
) {
  fun setDefaultAccount(accountId: DefaultAccountId): UserPreferences =
    copy(defaultAccountId = accountId)

  fun clearDefaultAccount(): UserPreferences =
    copy(defaultAccountId = null)

  companion object {
    fun empty(ownerId: PreferencesOwnerId): UserPreferences =
      UserPreferences(
        ownerId = ownerId,
        defaultAccountId = null,
      )
  }
}
