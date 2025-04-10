package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.AccountCreatedDto
import com.solidcoder.gonezo.account.api.dto.BalanceDto
import com.solidcoder.gonezo.account.api.dto.CreateAccountDto
import com.solidcoder.gonezo.account.application.command.CreateAccount
import com.solidcoder.gonezo.account.application.query.GetBalance
import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.Balance
import com.solidcoder.gonezo.account.domain.Currency
import io.mockk.every
import io.mockk.mockk
import java.math.BigDecimal
import java.util.*
import kotlin.test.assertFailsWith
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class AccountControllerTest {

    private val createAccount = mockk<CreateAccount>()
    private val getBalance = mockk<GetBalance>()

    private val controller = AccountController(
        createAccount = createAccount,
        getBalance = getBalance
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


    @Test
    fun `should return 400 when name is blank`() {
        val dto = CreateAccountDto(name = "   ", currency = "EUR")

        val exception = IllegalArgumentException("Account name must not be blank")
        every { createAccount.handle(dto.name, Currency("EUR")) } throws exception

        assertFailsWith<IllegalArgumentException> {
            controller.createAccount(dto)
        }
    }


    @Test
    fun `should return 400 for invalid currency`() {
        val dto = CreateAccountDto(name = "Valid", currency = "XXXINVALID")

        assertFailsWith<IllegalArgumentException> {
            controller.createAccount(dto)
        }
    }

    @Test
    fun `should throw exception if createAccount fails`() {
        val dto = CreateAccountDto(name = "Fail", currency = "EUR")

        every { createAccount.handle(dto.name, Currency("EUR")) } throws RuntimeException("DB error")

        assertFailsWith<RuntimeException> {
            controller.createAccount(dto)
        }
    }

    @Test
    fun `should return balance dto from balance domain object`() {
        val accountId = UUID.randomUUID()
        val balance = Balance(
            accountId = accountId,
            amount = BigDecimal("150.00"),
            currency = Currency("EUR")
        )

        every { getBalance.handle(accountId) } returns balance

        val response = controller.getBalance(accountId)

        val expectedDto = BalanceDto(accountId, BigDecimal("150.00"), "EUR")

        assertEquals(200, response.statusCode.value())
        assertEquals(expectedDto, response.body)
    }
}
