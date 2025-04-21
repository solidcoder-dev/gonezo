package com.solidcoder.gonezo.infrastructure.mapper

import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.AccountName
import com.solidcoder.gonezo.account.domain.Currency
import com.solidcoder.gonezo.infrastructure.persistence.AccountEntity
import org.springframework.stereotype.Component

interface AccountEntityMapper {
    fun toEntity(account: Account): AccountEntity
    fun toDomain(entity: AccountEntity): Account
}

@Component
class AccountEntityMapperV1 : AccountEntityMapper {
    override fun toEntity(account: Account): AccountEntity =
        AccountEntity(
            id = account.id,
            holderId = account.holderId,
            name = account.name.value,
            currency = account.currency.code
        )

    override fun toDomain(entity: AccountEntity): Account =
        Account(
            id = entity.id,
            holderId = entity.holderId,
            name = AccountName.unsafe(entity.name),
            currency = Currency(entity.currency)
        )
}