package com.gonezo.application.orchestration.backup

import com.gonezo.domain.shared.Money
import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.AccountStatus
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.ledger.domain.Transaction
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.ledger.domain.TransactionItem
import com.gonezo.ledger.domain.TransactionItemId
import com.gonezo.ledger.domain.TransactionStatus
import com.gonezo.ledger.domain.TransactionType
import com.gonezo.ledger.domain.ports.LedgerAccountRepository
import com.gonezo.ledger.domain.ports.LedgerTransactionRepository
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TransactionCategoryAssignment
import com.gonezo.taxonomy.domain.TransactionTagAssignment
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TagRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Instant
import java.math.BigDecimal
import java.util.UUID

class LedgerTaxonomyBackupSectionExporterTest {
    @Test
    fun `exports stable ledger identities and split item category`() {
        val accountId = AccountId.random()
        val categoryId = CategoryId.random()
        val tagId = TagId.random()
        val transactionId = TransactionId.random()
        val itemId = TransactionItemId.random()
        val transaction = Transaction(transactionId, accountId, TransactionType.EXPENSE, Money(BigDecimal("12.30"), "EUR"), Instant.EPOCH, "Lunch", null, TransactionStatus.POSTED, listOf(TransactionItem(itemId, "Meal", Money(BigDecimal("12.30"), "EUR"), null, categoryId.value.toString())), null)
        val exporter = com.gonezo.application.orchestration.backup.LedgerBackupSectionExporter(
            accountRepository = FakeAccounts(listOf(Account(accountId, "Main", AccountType.CASH, CurrencyCode("EUR"), AccountStatus.ACTIVE, Instant.EPOCH, null))),
            transactionRepository = FakeTransactions(listOf(transaction)),
            categoryAssignmentRepository = FakeCategories(mapOf(transactionId.value to TransactionCategoryAssignment(transactionId.value, categoryId, Instant.EPOCH))),
            tagAssignmentRepository = FakeTags(mapOf(transactionId.value to listOf(TransactionTagAssignment(transactionId.value, tagId, Instant.EPOCH)))),
        )

        val result = exporter.export()

        assertThat(result.accounts.single().id).isEqualTo(accountId.value.toString())
        assertThat(result.movements.single().categoryId).isEqualTo(categoryId.value.toString())
        assertThat(result.movements.single().splitItems.single().categoryId).isEqualTo(categoryId.value.toString())
        assertThat(result.movements.single().tagIds).containsExactly(tagId.value.toString())
    }
}

private class FakeAccounts(private val values: List<Account>) : LedgerAccountRepository {
    override fun save(account: Account) = Unit
    override fun findById(id: AccountId) = values.find { it.id == id }
    override fun exists(id: AccountId) = values.any { it.id == id }
    override fun deleteById(id: AccountId) = Unit
    override fun listAll() = values
}

private class FakeTransactions(private val values: List<Transaction>) : LedgerTransactionRepository {
    override fun save(transaction: Transaction) = Unit
    override fun listAll() = values
    override fun findById(id: TransactionId) = values.find { it.id == id }
    override fun findByAccount(accountId: AccountId, limit: Int?) = values.filter { it.accountId == accountId }
    override fun findByAccountAndPeriod(accountId: AccountId, range: com.gonezo.ledger.domain.DateRange) = values.filter { it.accountId == accountId }
    override fun findByAccountAndMerchant(accountId: AccountId, merchant: String) = values.filter { it.accountId == accountId }
}

private class FakeCategories(private val values: Map<UUID, TransactionCategoryAssignment>) : TransactionCategoryAssignmentRepository {
    override fun upsert(assignment: TransactionCategoryAssignment) = Unit
    override fun deleteByTransactionId(transactionId: UUID) = Unit
    override fun findByTransactionId(transactionId: UUID) = values[transactionId]
    override fun findByTransactionIds(transactionIds: Collection<UUID>) = values.filterKeys(transactionIds::contains)
}

private class FakeTags(private val values: Map<UUID, List<TransactionTagAssignment>>) : TransactionTagAssignmentRepository {
    override fun replaceByTransactionId(transactionId: UUID, assignments: List<TransactionTagAssignment>) = Unit
    override fun findByTransactionId(transactionId: UUID) = values[transactionId].orEmpty()
    override fun findByTransactionIds(transactionIds: Collection<UUID>) = values.filterKeys(transactionIds::contains)
}
