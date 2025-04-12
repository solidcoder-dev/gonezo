package com.solidcoder.gonezo.account.domain.repository

import com.solidcoder.gonezo.account.domain.Transaction
import com.solidcoder.gonezo.infrastructure.mapper.TransactionMapper
import com.solidcoder.gonezo.infrastructure.projection.TransactionView
import com.solidcoder.gonezo.infrastructure.repository.JpaTransactionRepository
import com.solidcoder.gonezo.shared.pagination.PageRequest
import com.solidcoder.gonezo.shared.pagination.PageResult
import java.util.*
import java.util.stream.Stream
import org.springframework.stereotype.Repository

interface TransactionRepository {
    fun save(transaction: Transaction)
    fun delete(transactionId: UUID)
    fun findByAccountId(accountId: UUID): List<Transaction>
    fun streamByAccountId(accountId: UUID): Stream<Transaction>
    fun findAllByAccountId(accountId: UUID, pageRequest: PageRequest): PageResult<TransactionView>
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

    override fun streamByAccountId(accountId: UUID): Stream<Transaction> {
        return jpaTransactionRepository.findStreamByAccountId(accountId).map(mapper::toDomain)
    }

    override fun findAllByAccountId(accountId: UUID, pageRequest: PageRequest): PageResult<TransactionView> {
        val pageable = org.springframework.data.domain.PageRequest.of(pageRequest.page, pageRequest.size)
        val result = jpaTransactionRepository.findAllByAccountId(accountId, pageable)

        return PageResult(
            content = result.content,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
            page = result.number,
            size = result.size
        )
    }
}
