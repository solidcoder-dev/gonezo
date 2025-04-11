package com.solidcoder.gonezo.account.application.command


import com.solidcoder.gonezo.account.domain.Account
import com.solidcoder.gonezo.account.domain.AccountName
import com.solidcoder.gonezo.account.domain.repository.AccountRepository
import com.solidcoder.gonezo.account.domain.Amount
import com.solidcoder.gonezo.account.domain.Transaction
import com.solidcoder.gonezo.account.domain.TransactionType
import com.solidcoder.gonezo.account.domain.Currency
import com.solidcoder.gonezo.account.domain.repository.TransactionRepository
import io.mockk.Runs
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*
import kotlin.test.assertFailsWith

class AddTransactionImplTest {

    private val accountRepository = mockk<AccountRepository>()
    private val transactionRepository = mockk<TransactionRepository>()
    private lateinit var handler: AddTransaction

    private val accountId = UUID.randomUUID()
    private val account = Account(accountId, AccountName.unsafe("Main"), Currency("EUR"))

    private val transaction = Transaction(
        accountId = accountId,
        amount = Amount(BigDecimal("50.00"), Currency("EUR")),
        type = TransactionType.EXPENSE,
        description = "Groceries",
        date = LocalDate.now(),
        category = "Food"
    )

    @BeforeEach
    fun setup() {
        handler = AddTransactionV1(accountRepository, transactionRepository)
    }

    @Test
    fun `should save transaction if account is valid`() {
        every { accountRepository.findById(accountId) } returns account
        every { transactionRepository.save(transaction) } just Runs

        handler.handle(accountId, transaction)

        verify { accountRepository.findById(accountId) }
        verify { transactionRepository.save(transaction) }
    }

    @Test
    fun `should throw if account not found`() {
        every { accountRepository.findById(accountId) } returns null

        assertFailsWith<IllegalArgumentException> {
            handler.handle(accountId, transaction)
        }

        verify(exactly = 0) { transactionRepository.save(any()) }
    }

    @Test
    fun `should throw if transaction is invalid for account`() {
        val invalidTx = transaction.copy(amount = Amount(BigDecimal("50.00"), Currency("USD")))
        every { accountRepository.findById(accountId) } returns account

        assertFailsWith<IllegalArgumentException> {
            handler.handle(accountId, invalidTx)
        }

        verify(exactly = 0) { transactionRepository.save(any()) }
    }
}
