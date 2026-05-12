package com.gonezo.preferences.domain

data class DefaultAccountId(val value: String) {
  init {
    require(value.isNotBlank()) { "default account id must not be blank" }
  }

  override fun toString(): String = value

  companion object {
    fun from(raw: String): DefaultAccountId = DefaultAccountId(raw.trim())
  }
}
