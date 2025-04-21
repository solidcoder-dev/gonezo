package com.solidcoder.gonezo.account.domain

import arrow.core.Either
import arrow.core.left
import arrow.core.right
import java.util.*

class Account(
    val id: UUID = UUID.randomUUID(),
    val holderId: UUID,
    val name: AccountName,
    val currency: Currency
) {
    fun validateTransaction(transaction: Transaction): Either<AccountValidationError, Unit> {
        return if (transaction.amount.currency == currency) {
            Unit.right()
        } else AccountValidationError("Transaction currency (${transaction.amount.currency.code}) does not match account currency").left()
    }
}

@JvmInline
value class AccountName private constructor(val value: String) {
    companion object {
        fun create(raw: String): Either<AccountValidationError, AccountName> {
            return if (raw.isNotBlank()) {
                AccountName(raw.trim()).right()
            } else {
                AccountValidationError("Account name cannot be blank").left()
            }
        }

        // Used by mappers only — trusted boundary
        fun unsafe(raw: String): AccountName = AccountName(raw)
    }
}

data class AccountValidationError(val reason: String)

