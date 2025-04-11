package com.solidcoder.gonezo.account.application.command

import com.solidcoder.gonezo.account.domain.repository.AccountRepository
import com.solidcoder.gonezo.account.domain.Transaction
import com.solidcoder.gonezo.account.domain.repository.TransactionRepository
import java.util.*
import org.springframework.stereotype.Service

interface AddTransaction {
    fun handle(accountId: UUID, transaction: Transaction)
}

@Service
class AddTransactionV1(
    private val accountRepository: AccountRepository,
    private val transactionRepository: TransactionRepository
) : AddTransaction {

    override fun handle(accountId: UUID, transaction: Transaction) {
        val account = accountRepository.findById(accountId)
            ?: throw IllegalArgumentException("Account not found")

        account.validateTransaction(transaction)

        transactionRepository.save(transaction)
    }
}
