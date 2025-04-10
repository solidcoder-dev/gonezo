package com.solidcoder.gonezo.account.application.command

import com.solidcoder.gonezo.account.api.dto.AccountCreatedDto
import com.solidcoder.gonezo.account.api.mapper.AccountDtoMapper
import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.AccountRepository
import com.solidcoder.gonezo.account.domain.Currency
import io.mockk.*
import java.util.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CreateAccountV1Test {

    private val repository = mockk<AccountRepository>()
    private val mapper = mockk<AccountDtoMapper>()

    private lateinit var useCase: CreateAccount

    @BeforeEach
    fun setup() {
        useCase = CreateAccountV1(repository, mapper)
    }

    @Test
    fun `should create and persist account with given name and currency`() {
        val name = "My Account"
        val currency = Currency("EUR")

        val slot = slot<Account>()
        every { repository.save(capture(slot)) } just Runs

        val expectedDto = AccountCreatedDto(UUID.randomUUID(), name, currency.code)
        every { mapper.toCreatedDto(any()) } returns expectedDto

        val result = useCase.handle(name, currency)

        verify(exactly = 1) { repository.save(any()) }

        assertEquals(expectedDto, result)
        assertTrue(result.id.toString().isNotEmpty())
    }
}
