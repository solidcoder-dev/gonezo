package com.solidcoder.gonezo.account.api

import com.solidcoder.gonezo.account.api.dto.CreateTransactionDto
import com.solidcoder.gonezo.account.api.dto.TransactionDto
import com.solidcoder.gonezo.account.api.mapper.TransactionDtoMapper
import com.solidcoder.gonezo.account.api.mapper.TransactionViewMapper
import com.solidcoder.gonezo.account.application.command.AddTransaction
import com.solidcoder.gonezo.account.application.query.GetTransactions
import com.solidcoder.gonezo.account.domain.*
import com.solidcoder.gonezo.account.domain.Currency
import com.solidcoder.gonezo.infrastructure.projection.TransactionView
import com.solidcoder.gonezo.shared.pagination.PageRequest
import com.solidcoder.gonezo.shared.pagination.PageResult
import io.mockk.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*
import kotlin.test.assertEquals

class TransactionControllerTest {

    private val addTransaction = mockk<AddTransaction>()
    private val getTransactions = mockk<GetTransactions>()
    private val dtoMapper = mockk<TransactionDtoMapper>()
    private val viewMapper = mockk<TransactionViewMapper>()

    private lateinit var controller: TransactionController
    private val accountId = UUID.randomUUID()

    @BeforeEach
    fun setup() {
        controller = TransactionController(addTransaction, getTransactions, dtoMapper, viewMapper)
    }

    @Nested
    inner class AddTransactionTests {

        @Test
        fun `should map dto and delegate transaction to use case`() {
            val dto = CreateTransactionDto(
                amount = BigDecimal("100.00"),
                currency = "EUR",
                type = "INCOME",
                description = "Salary",
                category = "Work",
                date = LocalDate.of(2025, 1, 1)
            )

            val domainTx = Transaction(
                accountId = accountId,
                amount = Amount(dto.amount, Currency(dto.currency)),
                type = TransactionType.INCOME,
                description = dto.description,
                category = dto.category,
                date = dto.date
            )

            every { dtoMapper.toDomain(accountId, dto) } returns domainTx
            every { addTransaction.handle(accountId, domainTx) } just Runs

            val response = controller.addTransaction(accountId, dto)

            verify { dtoMapper.toDomain(accountId, dto) }
            verify { addTransaction.handle(accountId, domainTx) }

            assertEquals(201, response.statusCode.value())
        }
    }

    @Nested
    inner class GetTransactionsTests {

        @Test
        fun `should return paginated transactions mapped to DTO`() {
            val view1 = mockk<TransactionView>()
            val view2 = mockk<TransactionView>()
            val dto1 = mockk<TransactionDto>()
            val dto2 = mockk<TransactionDto>()

            val result = PageResult(
                content = listOf(view1, view2),
                totalElements = 2,
                totalPages = 1,
                page = 0,
                size = 10
            )

            every { getTransactions.handle(accountId, PageRequest(0, 10)) } returns result
            every { viewMapper.toDto(view1) } returns dto1
            every { viewMapper.toDto(view2) } returns dto2

            val response = controller.getTransactions(accountId, page = 0, size = 10)

            assertEquals(200, response.statusCode.value())
            assertEquals(listOf(dto1, dto2), response.body?.content)
            assertEquals(2, response.body?.totalElements)
        }
    }
}
