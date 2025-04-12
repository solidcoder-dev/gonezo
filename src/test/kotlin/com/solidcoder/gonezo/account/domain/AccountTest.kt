package com.solidcoder.gonezo.account.domain

import arrow.core.Either
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*
import kotlin.test.assertIs
import org.junit.jupiter.api.Test

class AccountTest {

    private val eur = Currency("EUR")
    private val usd = Currency("USD")

    private val transaction = Transaction(
        accountId = UUID.randomUUID(),
        amount = Amount(BigDecimal("100.00"), eur),
        type = TransactionType.INCOME,
        description = "Salary",
        date = LocalDate.now(),
        category = "Work"
    )

    @Test
    fun `should accept transaction with same currency`() {
        val account = Account(UUID.randomUUID(), AccountName.unsafe("Main Account"), eur)
        val result = account.validateTransaction(transaction)
        assertIs<Either.Right<Unit>>(result)
    }

    @Test
    fun `should reject transaction with different currency`() {
        val account = Account(UUID.randomUUID(), AccountName.unsafe("Main Account"), usd)

        val result = account.validateTransaction(transaction)

        assertIs<Either.Left<AccountValidationError>>(result)
    }
}
