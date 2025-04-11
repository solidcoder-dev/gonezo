package com.solidcoder.gonezo.account.domain

import com.solidcoder.gonezo.account.domain.repository.AccountRepository
import com.solidcoder.gonezo.account.domain.repository.AccountRepositoryV1
import com.solidcoder.gonezo.infrastructure.mapper.AccountEntityMapperV1
import java.util.*
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.context.annotation.Import

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(AccountRepositoryV1::class, AccountEntityMapperV1::class)
class AccountRepositoryV1IntegrationTest {

    @Autowired
    private lateinit var repository: AccountRepository

    @Test
    fun `should save and retrieve account`() {
        val account = Account(name = AccountName.unsafe("Test Account"), currency = Currency("EUR"))
        repository.save(account)

        val found = repository.findById(account.id)

        assertNotNull(found)
        assertEquals(account.id, found.id)
        assertEquals(account.name, found.name)
        assertEquals(account.currency, found.currency)
    }

    @Test
    fun `should return null if account not found`() {
        val notFound = repository.findById(UUID.randomUUID())
        assertNull(notFound)
    }
}
