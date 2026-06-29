package com.gonezo.sharing.domain.ports

import com.gonezo.sharing.domain.ExpenseShare

interface ExpenseShareRepository {
  fun save(share: ExpenseShare)

  fun findBySourceTransactionId(sourceTransactionId: String): ExpenseShare?
}
