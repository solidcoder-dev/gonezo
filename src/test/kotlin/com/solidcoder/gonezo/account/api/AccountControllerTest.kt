package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.AccountCreatedDto
import com.solidcoder.gonezo.account.api.dto.CreateAccountDto
import com.solidcoder.gonezo.account.api.dto.CreateTransactionDto
import com.solidcoder.gonezo.account.api.mapper.TransactionDtoMapper
import com.solidcoder.gonezo.account.application.command.AddTransaction
import com.solidcoder.gonezo.account.application.command.CreateAccount
import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.Amount
import com.solidcoder.gonezo.account.domain.Currency
import com.solidcoder.gonezo.account.domain.Transaction
import com.solidcoder.gonezo.account.domain.TransactionType
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.verify
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test

class AccountControllerTest {

    @Nested
    inner class AddTransactionTests {
        private val addTransaction = mockk<AddTransaction>()
        private val mapper = mockk<TransactionDtoMapper>()
        private val controller = AccountController(
            addTransaction = addTransaction,
            transactionMapper = mapper,
            createAccount = mockk(),
        )

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

    @Nested
    inner class CreateAccountTests {
        private val createAccount = mockk<CreateAccount>()
        private val controller = AccountController(
            addTransaction = mockk(),
            transactionMapper = mockk(),
            createAccount = createAccount,
        )

        @Test
        fun `should create account and return dto`() {
            val dto = CreateAccountDto(name = "Savings", currency = "EUR")
            val currency = Currency("EUR")
            val account = Account(name = dto.name, currency = currency)
            val createdDto = AccountCreatedDto(account.id, account.name, currency.code)

            every { createAccount.handle(dto.name, currency) } returns createdDto

            val response = controller.createAccount(dto)

            assertEquals(201, response.statusCode.value())
            assertEquals(createdDto, response.body)
        }
    }
}
