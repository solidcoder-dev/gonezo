package com.solidcoder.gonezo.account.domain

import java.math.BigDecimal
import java.time.LocalDate
import java.util.*
import kotlin.test.assertFailsWith
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class TransactionTest {
    @Test
    fun `should create a valid transaction`() {
        val accountId = UUID.randomUUID()
        val amount = Amount(BigDecimal("100.00"), Currency("EUR"))

        val transaction = Transaction(
            accountId = accountId,
            amount = amount,
            type = TransactionType.INCOME,
            description = "Salary",
            date = LocalDate.of(2025, 1, 1),
            category = "work"
        )

        assertEquals(accountId, transaction.accountId)
        assertEquals(BigDecimal("100.00"), transaction.amount.value)
        assertEquals("EUR", transaction.amount.currency.code)
        assertEquals(TransactionType.INCOME, transaction.type)
    }

    @Test
    fun `should throw when amount is zero`() {
        assertFailsWith<IllegalArgumentException> {
            Transaction(
                accountId = UUID.randomUUID(),
                amount = Amount(BigDecimal.ZERO, Currency("EUR")),
                type = TransactionType.INCOME,
                description = "Invalid",
                date = LocalDate.now(),
                category = null
            )
        }
    }
}