package com.solidcoder.gonezo.account.application.query

import com.solidcoder.gonezo.infrastructure.projection.TransactionView
import com.solidcoder.gonezo.infrastructure.repository.ReadOnlyTransactionRepository
import com.solidcoder.gonezo.shared.pagination.PageRequest
import com.solidcoder.gonezo.shared.pagination.PageResult
import java.util.*
import org.springframework.stereotype.Service

interface GetTransactions {
    fun handle(accountId: UUID, pageRequest: PageRequest): PageResult<TransactionView>
}

@Service
class GetTransactionsV1(
    private val accountRepository: ReadOnlyTransactionRepository
) : GetTransactions {
    override fun handle(accountId: UUID, pageRequest: PageRequest): PageResult<TransactionView> {
        return accountRepository.findAllByAccountId(accountId, pageRequest)
    }

}