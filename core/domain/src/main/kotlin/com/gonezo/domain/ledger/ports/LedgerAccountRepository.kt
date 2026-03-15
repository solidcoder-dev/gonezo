package com.gonezo.domain.ledger.ports

import com.gonezo.domain.ledger.Account
import com.gonezo.domain.ledger.AccountId

interface LedgerAccountRepository {
  fun save(account: Account)

  fun findById(id: AccountId): Account?

  fun exists(id: AccountId): Boolean

  fun listAll(): List<Account>
}
