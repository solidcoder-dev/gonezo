package com.solidcoder.gonezo.infrastructure.repository

import com.solidcoder.gonezo.infrastructure.projection.TransactionView
import com.solidcoder.gonezo.shared.pagination.PageRequest
import com.solidcoder.gonezo.shared.pagination.PageResult
import java.util.*
import org.springframework.data.domain.PageRequest as SpringPageRequest
import org.springframework.stereotype.Repository

interface ReadOnlyTransactionRepository {
    fun findAllByAccountId(accountId: UUID, pageRequest: PageRequest): PageResult<TransactionView>

}

@Repository
class ReadOnlyTransactionRepositoryV1(
    private val jpaTransactionProjectionRepository: JpaTransactionRepository
) : ReadOnlyTransactionRepository {
    override fun findAllByAccountId(accountId: UUID, pageRequest: PageRequest): PageResult<TransactionView> {
        val pageable = SpringPageRequest.of(pageRequest.page, pageRequest.size)
        val result = jpaTransactionProjectionRepository.findAllByAccountId(accountId, pageable)

        return PageResult(
            content = result.content,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
            page = result.number,
            size = result.size
        )
    }
}