package com.gonezo.application.orchestration

import com.gonezo.domain.shared.Money
import com.gonezo.ledger.application.AddLedgerTransactionItemCommand
import com.gonezo.ledger.application.AddLedgerTransactionItemUC
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.ledger.domain.TransactionItemId
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.TransactionItemCategoryAssignment
import com.gonezo.taxonomy.domain.ports.TransactionItemCategoryAssignmentRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

class LedgerTransactionItemCategorizationTest {
    @Test
    fun `adds item to ledger and assigns category in taxonomy`() {
        val itemId = TransactionItemId.random()
        val categoryId = CategoryId(UUID.randomUUID())
        val repository = RecordingItemCategoryAssignments()
        val service = AddLedgerTransactionItemWithCategoryService(
            RecordingAddItem(itemId),
            repository,
        )
        val requestedAt = Instant.parse("2026-09-08T12:00:00Z")

        val result = service.execute(
            AddLedgerTransactionItemWithCategoryCommand(
                transactionId = TransactionId.random(),
                name = "Utilities",
                amount = Money(BigDecimal("12.00"), "USD"),
                categoryId = categoryId,
                note = "Monthly bill",
                requestedAt = requestedAt,
            ),
        )

        assertThat(result).isEqualTo(itemId.value)
        assertThat(repository.value).isEqualTo(
            TransactionItemCategoryAssignment.assign(itemId.value, categoryId, requestedAt),
        )
    }

    private class RecordingAddItem(private val itemId: TransactionItemId) : AddLedgerTransactionItemUC {
        override fun execute(command: AddLedgerTransactionItemCommand): TransactionItemId = itemId
    }

    private class RecordingItemCategoryAssignments : TransactionItemCategoryAssignmentRepository {
        var value: TransactionItemCategoryAssignment? = null

        override fun upsert(assignment: TransactionItemCategoryAssignment) {
            value = assignment
        }

        override fun deleteByTransactionItemIds(transactionItemIds: Collection<UUID>) = Unit

        override fun findByTransactionItemIds(transactionItemIds: Collection<UUID>): Map<UUID, TransactionItemCategoryAssignment> = emptyMap()
    }
}
