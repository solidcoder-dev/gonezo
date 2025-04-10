package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.CreateTransactionDto
import com.solidcoder.gonezo.account.api.mapper.TransactionDtoMapper
import com.solidcoder.gonezo.account.application.command.AddTransaction
import com.solidcoder.gonezo.account.domain.Amount
import com.solidcoder.gonezo.account.domain.Currency
import com.solidcoder.gonezo.account.domain.Transaction
import com.solidcoder.gonezo.account.domain.TransactionType
import io.mockk.*
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class AccountControllerTest {

    private val addTransaction = mockk<AddTransaction>()
    private val mapper = mockk<TransactionDtoMapper>()
    private lateinit var controller: AccountController

    private val accountId = UUID.randomUUID()

    private val dto = CreateTransactionDto(
        amount = BigDecimal("42.00"),
        currency = "EUR",
        type = "INCOME",
        description = "Gift",
        category = "Gifts",
        date = LocalDate.of(2025, 1, 1)
    )

    private val domainTransaction = Transaction(
        accountId = accountId,
        amount = Amount(dto.amount, Currency(dto.currency)),
        type = TransactionType.INCOME,
        description = dto.description,
        date = dto.date,
        category = dto.category
    )

    @BeforeEach
    fun setup() {
        controller = AccountController(addTransaction, mapper)
    }

    @Test
    fun `should map dto and delegate transaction to use case`() {
        every { mapper.toDomain(accountId, dto) } returns domainTransaction
        every { addTransaction.handle(accountId, domainTransaction) } just Runs

        val response = controller.addTransaction(accountId, dto)

        verify { mapper.toDomain(accountId, dto) }
        verify { addTransaction.handle(accountId, domainTransaction) }
        assertEquals(201, response.statusCode.value())
    }
}
