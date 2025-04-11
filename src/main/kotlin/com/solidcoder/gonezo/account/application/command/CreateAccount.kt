package com.solidcoder.gonezo.account.application.command

import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.repository.AccountRepository
import com.solidcoder.gonezo.account.domain.service.AccountFactory
import org.springframework.stereotype.Service

interface CreateAccount {
    fun handle(name: String, currencyCode: String): CreateAccountResult
}


sealed class CreateAccountResult {
    data class Success(val account: Account) : CreateAccountResult()
    data class ValidationFailed(val reason: String) : CreateAccountResult()
}


@Service
class CreateAccountV1(
    private val accountRepository: AccountRepository,
    private val accountFactory: AccountFactory,
) : CreateAccount {
    override fun handle(name: String, currencyCode: String): CreateAccountResult {
        return accountFactory.create(name = name, currencyCode = currencyCode)
            .onRight { account ->
                accountRepository.save(account)
            }.fold(
                ifLeft = { CreateAccountResult.ValidationFailed(it.reason) },
                ifRight = { CreateAccountResult.Success(it) }
            )
    }
}