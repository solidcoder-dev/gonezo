package com.solidcoder.gonezo.account.domain

import arrow.core.Either
import arrow.core.left
import arrow.core.right
import java.util.*

class AccountHolder(
    val id: UUID = UUID.randomUUID(),
    val name: AccountHolderName
)


@JvmInline
value class AccountHolderName private constructor(val value: String) {
    companion object {
        fun create(raw: String): Either<AccountHolderValidationError, AccountHolderName> {
            return if (raw.isNotBlank()) {
                AccountHolderName(raw.trim()).right()
            } else {
                AccountHolderValidationError("Account Holder name cannot be blank").left()
            }
        }

        // Used by mappers only — trusted boundary
        fun unsafe(raw: String): AccountHolderName = AccountHolderName(raw)
    }
}

data class AccountHolderValidationError(val reason: String)
