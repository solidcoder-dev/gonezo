package com.solidcoder.gonezo.account.api.mapper

import com.solidcoder.gonezo.account.api.dto.CreateTransactionDto
import com.solidcoder.gonezo.account.domain.TransactionType
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*
import kotlin.test.assertEquals
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class TransactionDtoMapperV1Test {

    private val mapper = TransactionDtoMapperV1()

    @Test
    fun `should map dto to domain transaction`() {
        val dto = CreateTransactionDto(
            amount = BigDecimal("12.50"),
            currency = "eur",
            type = "income",
            description = "Gift",
            category = "Birthday",
            date = LocalDate.of(2025, 1, 2)
        )

        val accountId = UUID.randomUUID()
        val tx = mapper.toDomain(accountId, dto)

        assertEquals(accountId, tx.accountId)
        assertEquals(BigDecimal("12.50"), tx.amount.value)
        assertEquals("EUR", tx.amount.currency.code)
        assertEquals(TransactionType.INCOME, tx.type)
        assertEquals("Gift", tx.description)
        assertEquals("Birthday", tx.category)
        assertEquals(LocalDate.of(2025, 1, 2), tx.date)
    }
}
