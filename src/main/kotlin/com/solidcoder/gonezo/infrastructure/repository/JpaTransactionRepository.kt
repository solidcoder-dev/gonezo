package com.solidcoder.gonezo.infrastructure.repository

import com.solidcoder.gonezo.infrastructure.persistence.TransactionEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.*

interface JpaTransactionRepository : JpaRepository<TransactionEntity, UUID> {
    fun findByAccountId(accountId: UUID): List<TransactionEntity>
}
