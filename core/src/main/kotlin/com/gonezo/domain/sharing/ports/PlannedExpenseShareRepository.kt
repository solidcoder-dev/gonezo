package com.gonezo.sharing.domain.ports

import com.gonezo.sharing.domain.ExpectedMovementRef
import com.gonezo.sharing.domain.PlannedExpenseShare
import com.gonezo.sharing.domain.PlannedExpenseShareId

interface PlannedExpenseShareRepository {
    fun save(share: PlannedExpenseShare)

    fun findById(id: PlannedExpenseShareId): PlannedExpenseShare?

    fun findByExpectedMovementRef(ref: ExpectedMovementRef): PlannedExpenseShare?

    fun listAll(): List<PlannedExpenseShare> = error("Listing all planned expense shares is not supported by this adapter")
}
