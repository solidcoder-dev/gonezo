package com.solidcoder.gonezo.account.application.query

import com.solidcoder.gonezo.infrastructure.projection.TransactionView
import com.solidcoder.gonezo.infrastructure.repository.ReadOnlyTransactionRepository
import com.solidcoder.gonezo.shared.pagination.PageRequest
import com.solidcoder.gonezo.shared.pagination.PageResult
import io.mockk.every
import io.mockk.mockk
import java.util.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class GetTransactionsV1Test {

    private val repository = mockk<ReadOnlyTransactionRepository>()

    private val getTransactionsV1 = GetTransactionsV1(
        accountRepository = repository
    )

    @Test
    fun `should return paginated transactions from repository`() {
        val accountId = UUID.randomUUID()
        val pageRequest = PageRequest(0, 10)

        val tx1 = mockk<TransactionView>()
        val tx2 = mockk<TransactionView>()

        val expected = PageResult(
            content = listOf(tx1, tx2),
            totalElements = 2,
            totalPages = 1,
            page = 0,
            size = 10
        )

        every { repository.findAllByAccountId(accountId, pageRequest) } returns expected

        val result = getTransactionsV1.handle(accountId, pageRequest)

        assertEquals(expected, result)
    }
}