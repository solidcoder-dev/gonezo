package com.gonezo.preferences.application

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.preferences.domain.UserPreferences
import com.gonezo.preferences.domain.ports.UserPreferencesRepository

class GetUserPreferencesService(
  private val repository: UserPreferencesRepository,
) : GetUserPreferencesUC {
  override fun execute(query: GetUserPreferencesQuery): UserPreferences =
    repository.findByOwnerId(query.ownerId) ?: UserPreferences.empty(query.ownerId)
}

class SetDefaultAccountService(
  private val repository: UserPreferencesRepository,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : SetDefaultAccountUC {
  override fun execute(command: SetDefaultAccountCommand) {
    consistencyBoundary.withinConsistencyBoundary {
      val preferences = repository.findByOwnerId(command.ownerId)
        ?: UserPreferences.empty(command.ownerId)
      repository.save(preferences.setDefaultAccount(command.accountId))
    }
  }
}

class ClearDefaultAccountService(
  private val repository: UserPreferencesRepository,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : ClearDefaultAccountUC {
  override fun execute(command: ClearDefaultAccountCommand) {
    consistencyBoundary.withinConsistencyBoundary {
      val preferences = repository.findByOwnerId(command.ownerId)
        ?: UserPreferences.empty(command.ownerId)
      repository.save(preferences.clearDefaultAccount())
    }
  }
}
