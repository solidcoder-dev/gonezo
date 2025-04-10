package com.solidcoder.gonezo.account.domain

import com.solidcoder.gonezo.infrastructure.mapper.TransactionMapperV1
import java.math.BigDecimal
import java.time.LocalDate
import java.util.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.context.annotation.Import

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TransactionRepositoryV1::class, TransactionMapperV1::class)
class TransactionRepositoryV1IntegrationTest {

    @Autowired
    private lateinit var transactionRepository: TransactionRepository

    private val accountId = UUID.randomUUID()

    @Test
    fun `should save and retrieve a transaction`() {
        val tx = Transaction(
            accountId = accountId,
            amount = Amount(BigDecimal("123.45"), Currency("EUR")),
            type = TransactionType.INCOME,
            description = "Test Income",
            date = LocalDate.now(),
            category = "Test"
        )

        transactionRepository.save(tx)

        val found = transactionRepository.findByAccountId(accountId)

        assertEquals(1, found.size)
        val saved = found.first()
        assertEquals(tx.amount.value, saved.amount.value)
        assertEquals(tx.description, saved.description)
    }

    @Test
    fun `should delete a transaction`() {
        val tx = Transaction(
            accountId = accountId,
            amount = Amount(BigDecimal("50.00"), Currency("EUR")),
            type = TransactionType.EXPENSE,
            description = "Groceries",
            date = LocalDate.now(),
            category = "Food"
        )

        transactionRepository.save(tx)
        assertEquals(1, transactionRepository.findByAccountId(accountId).size)

        transactionRepository.delete(tx.id)

        val remaining = transactionRepository.findByAccountId(accountId)
        assertEquals(0, remaining.size)
    }
}
