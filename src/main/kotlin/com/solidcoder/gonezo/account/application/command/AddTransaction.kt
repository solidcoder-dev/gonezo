package com.solidcoder.gonezo.account.application.command

import com.solidcoder.gonezo.account.domain.Transaction
import com.solidcoder.gonezo.account.domain.repository.AccountRepository
import com.solidcoder.gonezo.account.domain.repository.TransactionRepository
import java.util.*
import org.springframework.stereotype.Service

interface AddTransaction {
    fun handle(accountId: UUID, transaction: Transaction): AddTransactionResult
}

sealed class AddTransactionResult {
    object Success : AddTransactionResult()
    data class AccountNotFound(val accountId: UUID) : AddTransactionResult()
    data class ValidationFailed(val reason: String) : AddTransactionResult()
}

@Service
class AddTransactionV1(
    private val accountRepository: AccountRepository,
    private val transactionRepository: TransactionRepository
) : AddTransaction {

    override fun handle(accountId: UUID, transaction: Transaction): AddTransactionResult {
        val account = accountRepository.findById(accountId)
            ?: return AddTransactionResult.AccountNotFound(accountId)

        return account.validateTransaction(transaction)
            .onRight {
                transactionRepository.save(transaction)
            }
            .fold(
                ifLeft = { AddTransactionResult.ValidationFailed(it.reason) },
                ifRight = { AddTransactionResult.Success }
            )
    }
}
