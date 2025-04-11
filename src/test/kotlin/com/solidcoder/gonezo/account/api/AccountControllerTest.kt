package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.CreateAccountDto
import com.solidcoder.gonezo.account.api.mapper.AccountDtoMapper
import com.solidcoder.gonezo.account.application.command.CreateAccount
import com.solidcoder.gonezo.account.application.command.CreateAccountResult
import com.solidcoder.gonezo.account.application.query.GetBalance
import com.solidcoder.gonezo.account.domain.Account
import io.mockk.Called
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.instancio.Instancio
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

class AccountControllerTest {

    private val createAccount: CreateAccount = mockk()
    private val accountMapper: AccountDtoMapper = mockk()
    private val getBalance: GetBalance = mockk()
    private lateinit var controller: AccountController

    @BeforeEach
    fun setup() {
        controller = AccountController(getBalance, createAccount, accountMapper)
    }

    @Test
    fun `should return 201 Created when account creation succeeds`() {
        // Given
        val dto = Instancio.create(CreateAccountDto::class.java)
        val account = Instancio.create(Account::class.java)

        every { createAccount.handle(dto.name, dto.currency) } returns CreateAccountResult.Success(account)
        every { accountMapper.toCreatedDto(account) } returns mockk()

        // When
        val response = controller.createAccount(dto)

        // Then
        assertEquals(HttpStatus.CREATED, response.statusCode)
        verify { createAccount.handle(dto.name, dto.currency) }
        verify { accountMapper.toCreatedDto(account) }
    }

    @Test
    fun `should return 400 Bad Request when validation fails`() {
        // Given
        val dto = Instancio.create(CreateAccountDto::class.java)

        every { createAccount.handle(dto.name, dto.currency) } returns Instancio.create(CreateAccountResult.ValidationFailed::class.java)

        // When
        val response = controller.createAccount(dto)

        // Then
        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        verify { createAccount.handle(dto.name, dto.currency) }
        verify { accountMapper wasNot Called }
    }
}
