package com.gonezo.multiplatform.core

import android.content.Context
import com.gonezo.preferences.application.ClearDefaultAccountCommand
import com.gonezo.preferences.application.ClearDefaultAccountService
import com.gonezo.preferences.application.ClearDefaultAccountUC
import com.gonezo.preferences.application.GetUserPreferencesQuery
import com.gonezo.preferences.application.GetUserPreferencesService
import com.gonezo.preferences.application.GetUserPreferencesUC
import com.gonezo.preferences.application.SetDefaultAccountCommand
import com.gonezo.preferences.application.SetDefaultAccountService
import com.gonezo.preferences.application.SetDefaultAccountUC
import com.gonezo.preferences.domain.DefaultAccountId
import com.gonezo.preferences.domain.PreferencesOwnerId
import com.gonezo.preferences.domain.UserPreferences

class AndroidPreferencesCore private constructor(context: Context) {
  private val getUserPreferencesUC: GetUserPreferencesUC
  private val setDefaultAccountUC: SetDefaultAccountUC
  private val clearDefaultAccountUC: ClearDefaultAccountUC

  init {
    val database = CoreDatabase(context.applicationContext)
    val repository = AndroidUserPreferencesRepository(database)
    val consistencyBoundary = AndroidConsistencyBoundary(database)

    getUserPreferencesUC = GetUserPreferencesService(repository)
    setDefaultAccountUC = SetDefaultAccountService(repository, consistencyBoundary)
    clearDefaultAccountUC = ClearDefaultAccountService(repository, consistencyBoundary)
  }

  fun getPreferences(): UserPreferences =
    getUserPreferencesUC.execute(GetUserPreferencesQuery(PreferencesOwnerId.LOCAL_USER))

  fun setDefaultAccount(accountId: String) {
    setDefaultAccountUC.execute(
      SetDefaultAccountCommand(
        ownerId = PreferencesOwnerId.LOCAL_USER,
        accountId = DefaultAccountId.from(accountId),
      ),
    )
  }

  fun clearDefaultAccount() {
    clearDefaultAccountUC.execute(ClearDefaultAccountCommand(PreferencesOwnerId.LOCAL_USER))
  }

  companion object {
    @Volatile
    private var instance: AndroidPreferencesCore? = null

    @JvmStatic
    fun getInstance(context: Context): AndroidPreferencesCore =
      instance ?: synchronized(this) {
        instance ?: AndroidPreferencesCore(context).also { instance = it }
      }
  }
}
