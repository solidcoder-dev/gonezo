package com.solidcoder.gonezo.infrastructure.mapper

import com.solidcoder.gonezo.account.domain.AccountHolder
import com.solidcoder.gonezo.account.domain.AccountHolderName
import com.solidcoder.gonezo.infrastructure.persistence.AccountHolderEntity
import org.springframework.stereotype.Component

interface AccountHolderEntityMapper {
    fun toEntity(accountHolder: AccountHolder): AccountHolderEntity
    fun toDomain(entity: AccountHolderEntity): AccountHolder
}

@Component
class AccountHolderEntityMapperV1 : AccountHolderEntityMapper {
    override fun toEntity(accountHolder: AccountHolder): AccountHolderEntity =
        AccountHolderEntity(
            id = accountHolder.id,
            name = accountHolder.name.value
        )

    override fun toDomain(entity: AccountHolderEntity): AccountHolder =
        AccountHolder(
            id = entity.id,
            name = AccountHolderName.unsafe(entity.name)
        )
}
