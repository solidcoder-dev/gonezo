package com.solidcoder.gonezo.account.application.query

import com.solidcoder.gonezo.account.domain.repository.AccountRepository
import com.solidcoder.gonezo.account.domain.repository.TransactionRepository
import com.solidcoder.gonezo.infrastructure.projection.TransactionView
import com.solidcoder.gonezo.shared.pagination.PageRequest
import com.solidcoder.gonezo.shared.pagination.PageResult
import io.mockk.every
import io.mockk.mockk
import java.util.*
import kotlin.test.assertIs
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class GetTransactionsV1Test {

    private val repository = mockk<TransactionRepository>()
    private val accountRepository = mockk<AccountRepository>()

    private val getTransactionsV1 = GetTransactionsV1(
        accountRepository = accountRepository,
        transactionRepository = repository
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
        every { accountRepository.findById(accountId) } returns mockk()

        val result = getTransactionsV1.handle(accountId, pageRequest)

        assertIs<GetTransactionsResult.Success>(result)
        assertEquals(expected, result.transactionPage)
    }
}