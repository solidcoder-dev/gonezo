package com.gonezo.ledger.domain.ports

import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.AccountId

interface LedgerAccountRepository {
  fun save(account: Account)

  fun findById(id: AccountId): Account?

  fun exists(id: AccountId): Boolean

  fun deleteById(id: AccountId)

  fun listAll(): List<Account>
}
