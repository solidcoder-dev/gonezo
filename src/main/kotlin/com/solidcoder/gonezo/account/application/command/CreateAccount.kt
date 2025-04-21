package com.solidcoder.gonezo.account.application.command

import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.repository.AccountHolderRepository
import com.solidcoder.gonezo.account.domain.repository.AccountRepository
import com.solidcoder.gonezo.account.domain.service.AccountFactory
import java.util.*
import org.springframework.stereotype.Service

interface CreateAccount {
    fun handle(holderId: UUID, name: String, currencyCode: String): CreateAccountResult
}


sealed class CreateAccountResult {
    data class Success(val account: Account) : CreateAccountResult()
    data class ValidationFailed(val reason: String) : CreateAccountResult()
    data class NonExistentAccountHolder(val holderId: UUID) : CreateAccountResult()
}


@Service
class CreateAccountV1(
    private val accountRepository: AccountRepository,
    private val accountFactory: AccountFactory,
    private val accountHolderRepository: AccountHolderRepository,
) : CreateAccount {
    override fun handle(holderId: UUID, name: String, currencyCode: String): CreateAccountResult {
        accountHolderRepository.findById(holderId)
            ?: return CreateAccountResult.NonExistentAccountHolder(holderId)

        return accountFactory.create(holderId = holderId, name = name, currencyCode = currencyCode)
            .onRight { account ->
                accountRepository.save(account)
            }.fold(
                ifLeft = { CreateAccountResult.ValidationFailed(it.reason) },
                ifRight = { CreateAccountResult.Success(it) }
            )
    }
}