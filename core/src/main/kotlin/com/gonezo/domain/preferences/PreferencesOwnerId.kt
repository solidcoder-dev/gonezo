package com.gonezo.preferences.domain

data class PreferencesOwnerId(val value: String) {
  init {
    require(value.isNotBlank()) { "preferences owner id must not be blank" }
  }

  override fun toString(): String = value

  companion object {
    val LOCAL_USER = PreferencesOwnerId("local-user")

    fun from(raw: String): PreferencesOwnerId = PreferencesOwnerId(raw.trim())
  }
}
