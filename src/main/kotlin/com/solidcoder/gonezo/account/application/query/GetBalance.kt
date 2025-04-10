package com.solidcoder.gonezo.account.application.query

import com.solidcoder.gonezo.account.application.exception.AccountNotFoundException
import com.solidcoder.gonezo.account.domain.AccountRepository
import com.solidcoder.gonezo.account.domain.Balance
import com.solidcoder.gonezo.account.domain.Transaction
import com.solidcoder.gonezo.account.domain.TransactionRepository
import java.math.BigDecimal
import java.util.*
import org.springframework.stereotype.Service

interface GetBalance {
    fun handle(accountId: UUID): Balance
}


@Service
class GetBalanceV1(
    private val transactionRepository: TransactionRepository,
    private val accountRepository: AccountRepository
) : GetBalance {

    @Throws(AccountNotFoundException::class)
    override fun handle(accountId: UUID): Balance {
        val account = accountRepository.findById(accountId)
            ?: throw AccountNotFoundException(accountId)

        transactionRepository.streamByAccountId(accountId).use { stream ->
            val amount = stream.map(Transaction::asSignedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)

            return Balance(
                accountId = account.id,
                amount = amount,
                currency = account.currency
            )
        }
    }
}
