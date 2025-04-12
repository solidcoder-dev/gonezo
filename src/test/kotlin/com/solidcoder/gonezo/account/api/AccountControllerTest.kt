package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.AccountCreatedDto
import com.solidcoder.gonezo.account.api.dto.BalanceDto
import com.solidcoder.gonezo.account.api.dto.CreateAccountDto
import com.solidcoder.gonezo.account.api.mapper.AccountDtoMapper
import com.solidcoder.gonezo.account.api.mapper.BalanceDtoMapper
import com.solidcoder.gonezo.account.application.command.CreateAccount
import com.solidcoder.gonezo.account.application.command.CreateAccountResult
import com.solidcoder.gonezo.account.application.query.GetBalance
import com.solidcoder.gonezo.account.application.query.GetBalanceResult
import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.Balance
import io.mockk.Called
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import java.util.*
import org.instancio.Instancio
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

class AccountControllerTest {

    private val createAccount: CreateAccount = mockk()
    private val accountMapper: AccountDtoMapper = mockk()
    private val getBalance: GetBalance = mockk()
    private val balanceDtoMapper: BalanceDtoMapper = mockk()

    private fun buildController(): AccountController =
        AccountController(
            createAccount = createAccount,
            accountMapper = accountMapper,
            getBalance = getBalance,
            balanceDtoMapper = balanceDtoMapper
        )

    @Nested
    inner class CreateAccountTest {

        private lateinit var controller: AccountController

        @BeforeEach
        fun setup() {
            controller = buildController()
        }

        @Test
        fun `should return 201 Created when account creation succeeds`() {
            // Given
            val dto = Instancio.create(CreateAccountDto::class.java)
            val account = Instancio.create(Account::class.java)
            val createdDto = mockk<AccountCreatedDto>()

            every { createAccount.handle(dto.name, dto.currency) } returns CreateAccountResult.Success(account)
            every { accountMapper.toCreatedDto(account) } returns createdDto

            // When
            val response = controller.createAccount(dto)

            // Then
            assertEquals(HttpStatus.CREATED, response.statusCode)
            assertEquals(createdDto, response.body)
            verify { createAccount.handle(dto.name, dto.currency) }
            verify { accountMapper.toCreatedDto(account) }
        }

        @Test
        fun `should return 400 Bad Request when validation fails`() {
            // Given
            val dto = Instancio.create(CreateAccountDto::class.java)
            val result = Instancio.create(CreateAccountResult.ValidationFailed::class.java)

            every { createAccount.handle(dto.name, dto.currency) } returns result

            // When
            val response = controller.createAccount(dto)

            // Then
            assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
            verify { createAccount.handle(dto.name, dto.currency) }
            verify { accountMapper wasNot Called }
        }
    }

    @Nested
    inner class GetBalanceTest {

        private lateinit var controller: AccountController

        @BeforeEach
        fun setup() {
            controller = buildController()
        }

        @Test
        fun `should return 200 OK with account balance`() {
            // Given
            val accountId = UUID.randomUUID()
            val balance = Instancio.create(Balance::class.java)
            val balanceDto = mockk<BalanceDto>()

            every { getBalance.handle(accountId) } returns GetBalanceResult.Success(balance)
            every { balanceDtoMapper.toBalanceDto(balance) } returns balanceDto

            // When
            val response = controller.getBalance(accountId)

            // Then
            assertEquals(HttpStatus.OK, response.statusCode)
            assertEquals(balanceDto, response.body)
            verify { getBalance.handle(accountId) }
            verify { balanceDtoMapper.toBalanceDto(balance) }
        }

        @Test
        fun `should return 404 Not Found when account does not exist`() {
            // Given
            val accountId = UUID.randomUUID()
            val result = Instancio.create(GetBalanceResult.NonExistentAccount::class.java)

            every { getBalance.handle(accountId) } returns result

            // When
            val response = controller.getBalance(accountId)

            // Then
            assertEquals(HttpStatus.NOT_FOUND, response.statusCode)
            verify { getBalance.handle(accountId) }
            verify { balanceDtoMapper wasNot Called }
        }
    }
}
