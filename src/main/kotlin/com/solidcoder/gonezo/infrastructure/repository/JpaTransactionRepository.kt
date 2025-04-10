package com.solidcoder.gonezo.infrastructure.repository

import com.solidcoder.gonezo.infrastructure.persistence.TransactionEntity
import com.solidcoder.gonezo.infrastructure.projection.TransactionView
import java.util.*
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface JpaTransactionRepository : JpaRepository<TransactionEntity, UUID> {
    fun findByAccountId(accountId: UUID): List<TransactionEntity>

    @Query(
        value = """
            SELECT 
                t.id  id,
                t.account_id  accountId,
                t.amount  amount,
                t.currency  currency,
                t.type  type,
                t.description  description,
                t.category  category,
                t.date  date
            FROM transactions t
            WHERE t.account_id = :accountId
        """,
        countQuery = """
            SELECT COUNT(*) FROM transactions t WHERE t.account_id = :accountId
        """,
        nativeQuery = true
    )
    fun findAllByAccountId(accountId: UUID, pageable: Pageable): Page<TransactionView>
}
