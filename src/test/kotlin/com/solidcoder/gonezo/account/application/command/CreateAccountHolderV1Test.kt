package com.solidcoder.gonezo.account.application.command

import arrow.core.left
import arrow.core.right
import com.solidcoder.gonezo.account.domain.AccountHolder
import com.solidcoder.gonezo.account.domain.AccountHolderName
import com.solidcoder.gonezo.account.domain.AccountHolderValidationError
import com.solidcoder.gonezo.account.domain.repository.AccountHolderRepository
import com.solidcoder.gonezo.account.domain.service.AccountHolderFactory
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test

class CreateAccountHolderV1Test {

    private val repository = mockk<AccountHolderRepository>()
    private val factory = mockk<AccountHolderFactory>()
    private lateinit var useCase: CreateAccountHolder

    @BeforeEach
    fun setup() {
        useCase = CreateAccountHolderV1(repository, factory)
    }

    @Nested
    inner class WhenCreationSucceeds {

        @Test
        fun `should save account holder and return success`() {
            val name = "Jane Doe"
            val accountHolder = AccountHolder(name = AccountHolderName.unsafe(name))
            val slot = slot<AccountHolder>()

            every { factory.create(name) } returns accountHolder.right()
            every { repository.save(capture(slot)) } just Runs

            val result = useCase.handle(name)

            assertTrue(result is CreateAccountHolderResult.Success)
            assertEquals(accountHolder.id, (result as CreateAccountHolderResult.Success).id)
            assertEquals(name, slot.captured.name.value)
        }
    }

    @Nested
    inner class WhenCreationFails {

        @Test
        fun `should return validation failure when factory returns error`() {
            val name = "   "
            val error = AccountHolderValidationError("Name is blank")

            every { factory.create(name) } returns error.left()

            val result = useCase.handle(name)

            assertEquals(CreateAccountHolderResult.InvalidAccountHolder(error.reason), result)
            verify(exactly = 0) { repository.save(any()) }
        }
    }
}
