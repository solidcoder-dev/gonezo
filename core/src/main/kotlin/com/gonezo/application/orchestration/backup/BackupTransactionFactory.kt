package com.gonezo.application.orchestration.backup

import com.gonezo.domain.shared.Money
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.ledger.domain.Transaction
import com.gonezo.ledger.domain.TransactionId
import com.gonezo.ledger.domain.TransactionItem
import com.gonezo.ledger.domain.TransactionItemId
import com.gonezo.ledger.domain.TransactionStatus
import com.gonezo.ledger.domain.TransactionType
import com.gonezo.ledger.domain.ports.LedgerAccountRepository
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import java.math.BigDecimal

class BackupTransactionFactory(
    private val accountRepository: LedgerAccountRepository,
    private val categoryRepository: CategoryRepository,
) {
    fun create(schemaVersion: Int, movement: BackupPostedMovement): Transaction {
        val type = TransactionType.from(movement.type)
        val linkedTransactionId = movement.linkedTransactionId?.trim()?.ifBlank { null }?.let(TransactionId::from)
        if (type.requiresLinkedTransaction() && (schemaVersion < 2 || linkedTransactionId == null)) {
            throw BackupImportRowException(
                code = "UNSUPPORTED_BACKUP_ROW",
                message = "Backup schema version $schemaVersion cannot import transfer row ${movement.id}",
            )
        }

        val accountId = AccountId.from(movement.accountId)
        if (!accountRepository.exists(accountId)) {
            throw BackupImportRowException("ACCOUNT_NOT_FOUND", "Account not found: ${movement.accountId}")
        }

        return Transaction(
            id = TransactionId.from(movement.id),
            accountId = accountId,
            type = type,
            amount = Money(BigDecimal(movement.amount), CurrencyCode.from(movement.currency).value),
            occurredAt = movement.occurredAt,
            description = movement.description,
            merchant = movement.merchant,
            status = TransactionStatus.from(movement.status),
            items = movement.splitItems.map { item ->
                val itemCategoryId = item.categoryId?.trim()?.ifBlank { null }?.let(CategoryId::from)
                if (itemCategoryId != null && categoryRepository.findById(itemCategoryId) == null) {
                    throw BackupImportRowException("CATEGORY_NOT_FOUND", "Category not found: $itemCategoryId")
                }
                TransactionItem(
                    id = TransactionItemId.from(item.id),
                    name = item.name,
                    amount = Money(BigDecimal(item.amount), CurrencyCode.from(item.currency).value),
                    note = item.note,
                    categoryId = item.categoryId,
                )
            },
            linkedTransactionId = linkedTransactionId,
        )
    }

    private fun TransactionType.requiresLinkedTransaction(): Boolean = this == TransactionType.TRANSFER_IN || this == TransactionType.TRANSFER_OUT
}

class BackupImportRowException(val code: String, override val message: String) : RuntimeException(message)
