package com.solidcoder.gonezo.account.application.query

import com.solidcoder.gonezo.account.application.exception.AccountNotFoundException
import com.solidcoder.gonezo.account.domain.Balance
import com.solidcoder.gonezo.account.domain.Transaction
import com.solidcoder.gonezo.account.domain.repository.AccountRepository
import com.solidcoder.gonezo.account.domain.repository.TransactionRepository
import java.math.BigDecimal
import java.util.*
import org.springframework.stereotype.Service

interface GetBalance {
    fun handle(accountId: UUID): GetBalanceResult
}

sealed class GetBalanceResult {
    data class Success(val balance: Balance) : GetBalanceResult()
    data class NonExistentAccount(val accountId: UUID) : GetBalanceResult()
}

@Service
class GetBalanceV1(
    private val transactionRepository: TransactionRepository,
    private val accountRepository: AccountRepository
) : GetBalance {

    @Throws(AccountNotFoundException::class)
    override fun handle(accountId: UUID): GetBalanceResult {
        val account = accountRepository.findById(accountId)
            ?: return GetBalanceResult.NonExistentAccount(accountId)

        transactionRepository.streamByAccountId(accountId).use { stream ->
            val amount = stream.map(Transaction::asSignedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)

            return GetBalanceResult.Success(
                balance = Balance(
                    accountId = account.id,
                    amount = amount,
                    currency = account.currency
                )
            )
        }
    }
}
