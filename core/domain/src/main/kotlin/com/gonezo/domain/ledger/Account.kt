package com.gonezo.domain.ledger

import java.time.Instant

data class Account(
  val id: AccountId,
  val name: String,
  val type: AccountType,
  val currency: CurrencyCode,
  val status: AccountStatus,
  val createdAt: Instant,
  val archivedAt: Instant?,
) {
  init {
    require(name.isNotBlank()) { "name is required" }
  }

  fun rename(newName: String): Account {
    require(newName.isNotBlank()) { "name is required" }
    return copy(name = newName.trim())
  }

  fun archive(at: Instant): Account {
    if (status == AccountStatus.ARCHIVED) {
      return this
    }
    return copy(status = AccountStatus.ARCHIVED, archivedAt = at)
  }

  fun ensureCanRecordTransactions() {
    check(status == AccountStatus.ACTIVE) { "archived accounts cannot accept transactions" }
  }

  companion object {
    fun open(
      id: AccountId,
      name: String,
      type: AccountType,
      currency: CurrencyCode,
      createdAt: Instant,
    ): Account = Account(
      id = id,
      name = name.trim(),
      type = type,
      currency = currency,
      status = AccountStatus.ACTIVE,
      createdAt = createdAt,
      archivedAt = null,
    )
  }
}
