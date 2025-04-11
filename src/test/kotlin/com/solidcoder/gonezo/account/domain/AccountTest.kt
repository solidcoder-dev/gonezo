package com.solidcoder.gonezo.account.domain

import java.math.BigDecimal
import java.time.LocalDate
import java.util.*
import kotlin.test.assertFailsWith
import org.junit.jupiter.api.Assertions.assertDoesNotThrow
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
        assertDoesNotThrow {
            account.validateTransaction(transaction)
        }
    }

    @Test
    fun `should reject transaction with different currency`() {
        val account = Account(UUID.randomUUID(), AccountName.unsafe("Main Account"), usd)

        assertFailsWith<IllegalArgumentException> {
            account.validateTransaction(transaction)
        }
    }
}
