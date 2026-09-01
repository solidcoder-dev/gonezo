package com.gonezo.sharing.domain.ports

import com.gonezo.sharing.domain.ExpenseShare

interface ExpenseShareRepository {
    fun save(share: ExpenseShare)

    fun findBySourceTransactionId(sourceTransactionId: String): ExpenseShare?

    fun listAll(): List<ExpenseShare> = error("Listing all expense shares is not supported by this adapter")
}
