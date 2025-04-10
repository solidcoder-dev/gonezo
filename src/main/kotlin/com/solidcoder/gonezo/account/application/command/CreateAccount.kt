package com.solidcoder.gonezo.account.application.command

import com.solidcoder.gonezo.account.api.dto.AccountCreatedDto
import com.solidcoder.gonezo.account.api.mapper.AccountDtoMapper
import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.AccountRepository
import com.solidcoder.gonezo.account.domain.Currency
import org.springframework.stereotype.Service

interface CreateAccount {
    fun handle(name: String, currency: Currency): AccountCreatedDto
}

@Service
class CreateAccountV1(
    private val accountRepository: AccountRepository,
    private val accountDtoMapper: AccountDtoMapper,
) : CreateAccount {
    override fun handle(name: String, currency: Currency): AccountCreatedDto {
        val account = Account(name = name, currency = currency)
        accountRepository.save(account)
        return accountDtoMapper.toCreatedDto(account)
    }
}