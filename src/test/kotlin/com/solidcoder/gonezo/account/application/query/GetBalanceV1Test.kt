package com.solidcoder.gonezo.account.application.query

import com.solidcoder.gonezo.account.application.exception.AccountNotFoundException
import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.AccountName
import com.solidcoder.gonezo.account.domain.repository.AccountRepository
import com.solidcoder.gonezo.account.domain.Amount
import com.solidcoder.gonezo.account.domain.Currency
import com.solidcoder.gonezo.account.domain.Transaction
import com.solidcoder.gonezo.account.domain.repository.TransactionRepository
import com.solidcoder.gonezo.account.domain.TransactionType.EXPENSE
import com.solidcoder.gonezo.account.domain.TransactionType.INCOME
import io.mockk.every
import io.mockk.mockk
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import org.junit.jupiter.api.Test

class GetBalanceV1Test {

    private val transactionRepository = mockk<TransactionRepository>()
    private val accountRepository = mockk<AccountRepository>()
    private val useCase = GetBalanceV1(transactionRepository, accountRepository)

    @Test
    fun `should return correct balance for income and expenses`() {
        val accountId = UUID.randomUUID()
        val account = Account(accountId, AccountName.unsafe("anAccount"), Currency("EUR"))
        val currency = Currency("EUR")

        val txs = listOf(
            Transaction(accountId = accountId, amount = Amount(BigDecimal("100.00"), currency), type = INCOME, description = "Salary", category = "Job", date = LocalDate.now()),
            Transaction(
                accountId = accountId,
                amount = Amount(BigDecimal("25.00"), currency),
                type = EXPENSE,
                description = "Groceries",
                category = "Food",
                date = LocalDate.now()
            ),
            Transaction(accountId = accountId, amount = Amount(BigDecimal("10.00"), currency), type = EXPENSE, description = "Coffee", category = "Food", date = LocalDate.now()),
        )

        every { accountRepository.findById(accountId) } returns account
        every { transactionRepository.streamByAccountId(accountId) } returns txs.stream()

        val balance = useCase.handle(accountId)

        assertEquals(BigDecimal("65.00"), balance.amount)
    }


    @Test
    fun `should throw AccountNotFoundException if account does not exist`() {
        val accountId = UUID.randomUUID()

        every { accountRepository.findById(accountId) } returns null

        assertFailsWith<AccountNotFoundException> {
            useCase.handle(accountId)
        }
    }
}
