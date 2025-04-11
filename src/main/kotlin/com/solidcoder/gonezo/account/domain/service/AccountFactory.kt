package com.solidcoder.gonezo.account.domain.service

import arrow.core.Either
import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.AccountName
import com.solidcoder.gonezo.account.domain.AccountValidationError
import com.solidcoder.gonezo.account.domain.Currency
import org.springframework.stereotype.Service

interface AccountFactory {
    fun create(name: String, currencyCode: String): Either<AccountValidationError, Account>
}

@Service
class AccountFactoryV1 : AccountFactory {
    override fun create(name: String, currencyCode: String): Either<AccountValidationError, Account> {
        return AccountName.create(name).map { nameObj ->
            Account(name = nameObj, currency = Currency(currencyCode))
        }
    }
}
