package com.solidcoder.gonezo.account.application.query

import com.solidcoder.gonezo.account.domain.repository.AccountRepository
import com.solidcoder.gonezo.account.domain.repository.TransactionRepository
import com.solidcoder.gonezo.infrastructure.projection.TransactionView
import com.solidcoder.gonezo.shared.pagination.PageRequest
import com.solidcoder.gonezo.shared.pagination.PageResult
import java.util.*
import org.springframework.stereotype.Service

interface GetTransactions {
    fun handle(accountId: UUID, pageRequest: PageRequest): GetTransactionsResult
}

sealed interface GetTransactionsResult {
    data class Success(val transactionPage: PageResult<TransactionView>) : GetTransactionsResult
    data class AccountNotFound(val accountId: UUID) : GetTransactionsResult
}

@Service
class GetTransactionsV1(
    private val transactionRepository: TransactionRepository,
    private val accountRepository: AccountRepository
) : GetTransactions {

    override fun handle(accountId: UUID, pageRequest: PageRequest): GetTransactionsResult {
        accountRepository.findById(accountId)
            ?: return GetTransactionsResult.AccountNotFound(accountId)

        val page = transactionRepository.findAllByAccountId(accountId, pageRequest)
        return GetTransactionsResult.Success(page)
    }
}
