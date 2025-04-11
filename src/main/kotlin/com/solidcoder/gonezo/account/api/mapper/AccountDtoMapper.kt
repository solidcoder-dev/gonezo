package com.solidcoder.gonezo.account.api.mapper

import com.solidcoder.gonezo.account.api.dto.AccountCreatedDto
import com.solidcoder.gonezo.account.domain.Account
import org.springframework.stereotype.Component

interface AccountDtoMapper {
    fun toCreatedDto(account: Account): AccountCreatedDto
}

@Component
class AccountDtoMapperV1 : AccountDtoMapper {
    override fun toCreatedDto(account: Account): AccountCreatedDto =
        AccountCreatedDto(
            id = account.id,
            name = account.name.value,
            currency = account.currency.code
        )
}
