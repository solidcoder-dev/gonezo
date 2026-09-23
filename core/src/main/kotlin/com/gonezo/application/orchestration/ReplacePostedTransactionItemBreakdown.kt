package com.gonezo.application.orchestration

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.ledger.application.ReplacePostedTransactionItemsCommand
import com.gonezo.ledger.application.ReplacePostedTransactionItemsUC
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.ledger.domain.TransactionItem
import com.gonezo.ledger.domain.ports.LedgerTransactionRepository
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TransactionItemCategoryAssignment
import com.gonezo.taxonomy.domain.TransactionItemTagAssignment
import com.gonezo.taxonomy.domain.ports.TransactionItemCategoryAssignmentRepository
import com.gonezo.taxonomy.domain.ports.TransactionItemTagAssignmentRepository
import java.time.Instant

data class PostedTransactionItemBreakdownEntry(val item: TransactionItem, val categoryId: CategoryId?, val tagIds: List<TagId>)

data class ReplacePostedTransactionItemBreakdownCommand(val transactionId: TransactionId, val items: List<PostedTransactionItemBreakdownEntry>, val changedAt: Instant)

fun interface ReplacePostedTransactionItemBreakdownUC {
    fun execute(command: ReplacePostedTransactionItemBreakdownCommand)
}

class ReplacePostedTransactionItemBreakdownService(private val replacePostedItems: ReplacePostedTransactionItemsUC, private val transactions: LedgerTransactionRepository, private val itemCategoryAssignments: TransactionItemCategoryAssignmentRepository, private val itemTagAssignments: TransactionItemTagAssignmentRepository, private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary) : ReplacePostedTransactionItemBreakdownUC {
    override fun execute(command: ReplacePostedTransactionItemBreakdownCommand) = consistencyBoundary.withinConsistencyBoundary {
        val transaction = transactions.findById(command.transactionId) ?: error("Transaction not found: ${command.transactionId}")
        val existingItemIds = transaction.items.map { it.id.value }
        val itemIds = command.items.map { it.item.id.value }
        require(itemIds.toSet().size == itemIds.size) { "duplicate item id" }
        replacePostedItems.execute(ReplacePostedTransactionItemsCommand(command.transactionId, command.items.map { it.item }))

        itemCategoryAssignments.deleteByTransactionItemIds(existingItemIds)
        itemTagAssignments.deleteByTransactionItemIds(existingItemIds)
        command.items.forEach { entry ->
            entry.categoryId?.let { categoryId ->
                itemCategoryAssignments.upsert(TransactionItemCategoryAssignment.assign(entry.item.id.value, categoryId, command.changedAt))
            }
            val tags = entry.tagIds.distinct().map { tagId -> TransactionItemTagAssignment.assign(entry.item.id.value, tagId, command.changedAt) }
            itemTagAssignments.replaceByTransactionItemId(entry.item.id.value, tags)
        }
    }
}
