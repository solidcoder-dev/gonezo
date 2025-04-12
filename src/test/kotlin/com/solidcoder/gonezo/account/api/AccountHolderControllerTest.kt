package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.AccountHolderCreatedDto
import com.solidcoder.gonezo.account.api.dto.CreateAccountHolderDto
import com.solidcoder.gonezo.account.api.dto.ErrorDto
import com.solidcoder.gonezo.account.application.command.CreateAccountHolder
import com.solidcoder.gonezo.account.application.command.CreateAccountHolderResult
import io.mockk.every
import io.mockk.mockk
import java.util.*
import kotlin.test.assertEquals
import org.instancio.Instancio
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

class AccountHolderControllerTest {

    private val useCase = mockk<CreateAccountHolder>()
    private val controller = AccountHolderController(useCase)

    @Test
    fun `should return 201 with created dto on success`() {
        val dto = Instancio.create(CreateAccountHolderDto::class.java)
        val generatedId = UUID.randomUUID()

        every { useCase.handle(dto.name) } returns CreateAccountHolderResult.Success(generatedId)

        val response = controller.create(dto)

        assertEquals(HttpStatus.CREATED, response.statusCode)
        val body = response.body as AccountHolderCreatedDto
        assertEquals(generatedId, body.id)
    }

    @Test
    fun `should return 400 with error message on invalid name`() {
        val dto = Instancio.create(CreateAccountHolderDto::class.java)
        val errorMessage = "Name cannot be blank"

        every { useCase.handle(dto.name) } returns CreateAccountHolderResult.InvalidAccountHolder(errorMessage)

        val response = controller.create(dto)

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        val body = response.body as ErrorDto
        assertEquals(errorMessage, body.message)
    }
}
