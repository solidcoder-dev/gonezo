package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.AccountCreatedDto
import com.solidcoder.gonezo.account.api.dto.CreateAccountDto
import com.solidcoder.gonezo.account.application.command.CreateAccount
import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.Currency
import io.mockk.every
import io.mockk.mockk
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class AccountControllerTest {

    private val createAccount = mockk<CreateAccount>()
    private val controller = AccountController(
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
