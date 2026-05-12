package com.gonezo.preferences.application

import com.gonezo.preferences.domain.DefaultAccountId
import com.gonezo.preferences.domain.PreferencesOwnerId
import com.gonezo.preferences.domain.UserPreferences
import com.gonezo.preferences.domain.ports.UserPreferencesRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class UserPreferencesServiceTest {

  @Test
  fun `returns empty preferences when owner has no saved preferences`() {
    val repository = MutableUserPreferencesRepository()
    val service = GetUserPreferencesService(repository)

    val preferences = service.execute(GetUserPreferencesQuery(PreferencesOwnerId.LOCAL_USER))

    assertThat(preferences.ownerId).isEqualTo(PreferencesOwnerId.LOCAL_USER)
    assertThat(preferences.defaultAccountId).isNull()
  }

  @Test
  fun `sets default account without depending on ledger account state`() {
    val repository = MutableUserPreferencesRepository()
    val service = SetDefaultAccountService(repository)

    service.execute(
      SetDefaultAccountCommand(
        ownerId = PreferencesOwnerId.LOCAL_USER,
        accountId = DefaultAccountId.from("acc-2"),
      ),
    )

    val saved = repository.findByOwnerId(PreferencesOwnerId.LOCAL_USER)
    assertThat(saved).isNotNull
    assertThat(saved!!.defaultAccountId).isEqualTo(DefaultAccountId.from("acc-2"))
  }

  @Test
  fun `clears default account while keeping user preferences`() {
    val repository = MutableUserPreferencesRepository(
      UserPreferences(
        ownerId = PreferencesOwnerId.LOCAL_USER,
        defaultAccountId = DefaultAccountId.from("acc-2"),
      ),
    )
    val service = ClearDefaultAccountService(repository)

    service.execute(ClearDefaultAccountCommand(PreferencesOwnerId.LOCAL_USER))

    val saved = repository.findByOwnerId(PreferencesOwnerId.LOCAL_USER)
    assertThat(saved).isNotNull
    assertThat(saved!!.defaultAccountId).isNull()
  }

  @Test
  fun `does not allow blank default account`() {
    assertThatThrownBy {
      DefaultAccountId.from("   ")
    }.isInstanceOf(IllegalArgumentException::class.java)
  }
}

private class MutableUserPreferencesRepository(
  vararg preferences: UserPreferences,
) : UserPreferencesRepository {
  private val values = preferences.associateBy { it.ownerId }.toMutableMap()

  override fun save(preferences: UserPreferences) {
    values[preferences.ownerId] = preferences
  }

  override fun findByOwnerId(ownerId: PreferencesOwnerId): UserPreferences? = values[ownerId]
}
