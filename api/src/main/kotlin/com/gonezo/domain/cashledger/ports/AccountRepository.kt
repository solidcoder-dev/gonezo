package com.gonezo.domain.cashledger.ports

import com.gonezo.domain.cashledger.Account
import java.util.UUID

interface AccountRepository {
  fun get(id: UUID): Account
  fun save(account: Account)
}
