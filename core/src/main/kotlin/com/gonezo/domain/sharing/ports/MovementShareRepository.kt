package com.gonezo.sharing.domain.ports

import com.gonezo.sharing.domain.MovementShare

interface MovementShareRepository {
    fun save(share: MovementShare)

    fun findBySourceTransactionId(sourceTransactionId: String): MovementShare?

    fun listAll(): List<MovementShare> = error("Listing all expense shares is not supported by this adapter")
}
