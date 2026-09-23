package com.gonezo.sharing.domain.ports

import com.gonezo.sharing.domain.ExpectedMovementRef
import com.gonezo.sharing.domain.PlannedMovementShare
import com.gonezo.sharing.domain.PlannedMovementShareId

interface PlannedMovementShareRepository {
    fun save(share: PlannedMovementShare)

    fun findById(id: PlannedMovementShareId): PlannedMovementShare?

    fun findByExpectedMovementRef(ref: ExpectedMovementRef): PlannedMovementShare?

    fun listAll(): List<PlannedMovementShare> = error("Listing all planned expense shares is not supported by this adapter")
}
