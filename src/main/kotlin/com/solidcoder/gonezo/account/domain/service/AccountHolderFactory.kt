package com.solidcoder.gonezo.account.domain.service

import arrow.core.Either
import com.solidcoder.gonezo.account.domain.AccountHolder
import com.solidcoder.gonezo.account.domain.AccountHolderName
import com.solidcoder.gonezo.account.domain.AccountHolderValidationError
import org.springframework.stereotype.Service

interface AccountHolderFactory {
    fun create(name: String): Either<AccountHolderValidationError, AccountHolder>
}

@Service
class AccountHolderFactoryV1 : AccountHolderFactory {
    override fun create(name: String): Either<AccountHolderValidationError, AccountHolder> {
        return AccountHolderName.create(name).map { nameObj ->
            AccountHolder(name = nameObj)
        }
    }
}
