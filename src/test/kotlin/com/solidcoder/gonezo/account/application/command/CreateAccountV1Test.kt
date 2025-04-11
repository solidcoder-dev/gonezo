package com.solidcoder.gonezo.account.application.command

import arrow.core.Either
import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.AccountName
import com.solidcoder.gonezo.account.domain.AccountValidationError
import com.solidcoder.gonezo.account.domain.Currency
import com.solidcoder.gonezo.account.domain.repository.AccountRepository
import com.solidcoder.gonezo.account.domain.service.AccountFactory
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.verify
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class CreateAccountV1Test {

    private lateinit var accountRepository: AccountRepository
    private lateinit var accountFactory: AccountFactory
    private lateinit var createAccount: CreateAccountV1

    @BeforeEach
    fun setUp() {
        accountRepository = mockk(relaxed = true)
        accountFactory = mockk()
        createAccount = CreateAccountV1(accountRepository, accountFactory)
    }

    @Test
    fun `should return Success and save account when factory returns valid account`() {
        // Given
        val accountName = AccountName.unsafe("Test Account")
        val currency = Currency("USD")
        val account = Account(name = accountName, currency = currency)

        every { accountFactory.create("Test Account", "USD") } returns Either.Right(account)
        every { accountRepository.save(account) } just Runs

        // When
        val result = createAccount.handle("Test Account", "USD")

        // Then
        assertTrue(result is CreateAccountResult.Success)
        assertEquals(account, (result as CreateAccountResult.Success).account)
        verify(exactly = 1) { accountRepository.save(account) }
    }

    @Test
    fun `should return ValidationFailed when account name is invalid`() {
        // Given
        val error = AccountValidationError("Account name cannot be blank")

        every { accountFactory.create("", "USD") } returns Either.Left(error)

        // When
        val result = createAccount.handle("", "USD")

        // Then
        assertTrue(result is CreateAccountResult.ValidationFailed)
        assertEquals("Account name cannot be blank", (result as CreateAccountResult.ValidationFailed).reason)
        verify(exactly = 0) { accountRepository.save(any()) }
    }
}
