package com.gonezo.application.orchestration

import com.gonezo.domain.shared.Money
import com.gonezo.ledger.application.AddLedgerTransactionItemCommand
import com.gonezo.ledger.application.AddLedgerTransactionItemUC
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.TransactionItemCategoryAssignment
import com.gonezo.taxonomy.domain.ports.TransactionItemCategoryAssignmentRepository
import java.time.Instant
import java.util.UUID

data class AddLedgerTransactionItemWithCategoryCommand(
    val transactionId: TransactionId,
    val name: String,
    val amount: Money,
    val categoryId: CategoryId?,
    val note: String?,
    val requestedAt: Instant,
)

interface AddLedgerTransactionItemWithCategoryUC {
    fun execute(command: AddLedgerTransactionItemWithCategoryCommand): UUID
}

class AddLedgerTransactionItemWithCategoryService(
    private val addLedgerTransactionItemUC: AddLedgerTransactionItemUC,
    private val itemCategoryAssignmentRepository: TransactionItemCategoryAssignmentRepository,
) : AddLedgerTransactionItemWithCategoryUC {
    override fun execute(command: AddLedgerTransactionItemWithCategoryCommand): UUID {
        val itemId = addLedgerTransactionItemUC.execute(
            AddLedgerTransactionItemCommand(
                transactionId = command.transactionId,
                name = command.name,
                amount = command.amount,
                note = command.note,
            ),
        )
        command.categoryId?.let {
            itemCategoryAssignmentRepository.upsert(
                TransactionItemCategoryAssignment.assign(itemId.value, it, command.requestedAt),
            )
        }
        return itemId.value
    }
}
