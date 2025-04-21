package com.solidcoder.gonezo.account.domain.service

import arrow.core.Either
import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.AccountName
import com.solidcoder.gonezo.account.domain.AccountValidationError
import com.solidcoder.gonezo.account.domain.Currency
import java.util.*
import org.springframework.stereotype.Service

interface AccountFactory {
    fun create(holderId: UUID, name: String, currencyCode: String): Either<AccountValidationError, Account>
}

@Service
class AccountFactoryV1 : AccountFactory {
    override fun create(holderId: UUID, name: String, currencyCode: String): Either<AccountValidationError, Account> {
        return AccountName.create(name).map { nameObj ->
            Account(holderId = holderId, name = nameObj, currency = Currency(currencyCode))
        }
    }
}
