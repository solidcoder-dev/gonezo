package com.solidcoder.gonezo.account.domain

import com.solidcoder.gonezo.infrastructure.mapper.TransactionMapper
import com.solidcoder.gonezo.infrastructure.repository.JpaTransactionRepository
import java.util.*
import org.springframework.stereotype.Repository

interface TransactionRepository {
    fun save(transaction: Transaction)
    fun delete(transactionId: UUID)
    fun findByAccountId(accountId: UUID): List<Transaction>
}

@Repository
class TransactionRepositoryV1(
    private val jpaTransactionRepository: JpaTransactionRepository,
    private val mapper: TransactionMapper
) : TransactionRepository {
    override fun save(transaction: Transaction) {
        jpaTransactionRepository.save(mapper.toEntity(transaction))
    }

    override fun delete(transactionId: UUID) {
        jpaTransactionRepository.deleteById(transactionId)
    }

    override fun findByAccountId(accountId: UUID): List<Transaction> {
        return jpaTransactionRepository.findByAccountId(accountId).map {
            mapper.toDomain(it)
        }
    }
}
