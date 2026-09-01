package com.gonezo.application.orchestration.backup

import com.gonezo.application.backup.contract.*
import com.gonezo.application.backup.contract.BackupErrorCode
import com.gonezo.application.backup.contract.BackupReference
import com.gonezo.application.backup.contract.BackupValidationResult
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
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.CategoryStatus
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TagStatus
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TagRepository
import com.gonezo.taxonomy.domain.ports.TransactionCategoryAssignmentRepository
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository
import java.math.BigDecimal
import java.util.UUID

data class TaxonomyBackupSection(val categories: List<BackupCategory>, val tags: List<BackupTag>) : BackupSection {
    override val sectionId = BackupSectionId.TAXONOMY
    override val version = 1

    override fun references() = categories.map { BackupReference.Category(it.id) } + tags.map { BackupReference.Tag(it.id) }
}

data class LedgerBackupSection(val accounts: List<BackupAccount>, val movements: List<BackupPostedMovement>) : BackupSection {
    override val sectionId = BackupSectionId.LEDGER
    override val version = 1

    override fun references() = accounts.map { BackupReference.Account(it.id) } + movements.flatMap { movement -> listOf(BackupReference.Movement(movement.id)) + movement.splitItems.map { BackupReference.SplitItem(it.id) } }
}

class TaxonomyBackupSectionExporter(private val categoryRepository: CategoryRepository, private val tagRepository: TagRepository) : BackupSectionExporter {
    override val sectionId = BackupSectionId.TAXONOMY
    override val version = 1

    override fun export(): TaxonomyBackupSection = TaxonomyBackupSection(
        categories = categoryRepository.listAll().map { it.category.toBackup() }.sortedBy { it.id },
        tags = tagRepository.listAll().map { it.toBackup() }.sortedBy { it.id },
    )
}

class TaxonomyBackupSectionImporter(private val categoryRepository: CategoryRepository, private val tagRepository: TagRepository) : BackupSectionImporter {
    override val sectionId = BackupSectionId.TAXONOMY
    override val supportedVersions = setOf(1)
    override val dependencies = emptySet<BackupSectionId>()

    override fun validate(section: BackupSection, context: BackupImportContext): BackupValidationResult {
        if (section !is TaxonomyBackupSection) return BackupValidationResult.Invalid(BackupErrorCode.INVALID_DATA, "Expected taxonomy backup section")
        return try {
            uniqueIds(section.categories.map { it.id }, "category")
            uniqueIds(section.tags.map { it.id }, "tag")
            section.categories.forEach {
                require(it.name.isNotBlank())
                CategoryAppliesTo.from(it.appliesTo)
                CategoryStatus.from(it.status)
            }
            section.tags.forEach {
                require(it.name.isNotBlank())
                TagStatus.from(it.status)
            }
            BackupValidationResult.Valid
        } catch (error: IllegalArgumentException) {
            BackupValidationResult.Invalid(BackupErrorCode.INVALID_DATA, error.message ?: "Invalid taxonomy backup section")
        }
    }

    override fun import(section: BackupSection, context: BackupImportContext) {
        val taxonomy = section as? TaxonomyBackupSection
            ?: throw BackupImportException(BackupErrorCode.INVALID_DATA, "Expected taxonomy backup section")
        taxonomy.categories.forEach { category ->
            val status = CategoryStatus.from(category.status)
            categoryRepository.save(
                com.gonezo.taxonomy.domain.Category(
                    id = CategoryId.from(category.id),
                    name = category.name,
                    appliesTo = CategoryAppliesTo.from(category.appliesTo),
                    status = status,
                    createdAt = category.createdAt ?: context.importedAt,
                    archivedAt = category.archivedAt ?: if (status == CategoryStatus.ARCHIVED) context.importedAt else null,
                ),
            )
        }
        taxonomy.tags.forEach { tag ->
            val status = TagStatus.from(tag.status)
            tagRepository.save(
                com.gonezo.taxonomy.domain.Tag(
                    id = TagId.from(tag.id),
                    name = tag.name,
                    status = status,
                    createdAt = tag.createdAt ?: context.importedAt,
                    archivedAt = tag.archivedAt ?: if (status == TagStatus.ARCHIVED) context.importedAt else null,
                ),
            )
        }
    }
}

class LedgerBackupSectionExporter(private val accountRepository: LedgerAccountRepository, private val transactionRepository: LedgerTransactionRepository, private val categoryAssignmentRepository: TransactionCategoryAssignmentRepository, private val tagAssignmentRepository: TransactionTagAssignmentRepository) : BackupSectionExporter {
    override val sectionId = BackupSectionId.LEDGER
    override val version = 1

    override fun export(): LedgerBackupSection {
        val transactions = transactionRepository.listAll()
        val transactionIds = transactions.map { it.id.value }
        val categories = categoryAssignmentRepository.findByTransactionIds(transactionIds)
        val tags = tagAssignmentRepository.findByTransactionIds(transactionIds)
        return LedgerBackupSection(
            accounts = accountRepository.listAll().map(BackupMappers::account).sortedBy { it.id },
            movements = transactions.map { transaction ->
                BackupMappers.transaction(
                    transaction,
                    categories[transaction.id.value]?.categoryId?.value?.toString(),
                    tags[transaction.id.value].orEmpty().map { it.tagId.value.toString() },
                )
            }.sortedBy { it.id },
        )
    }
}

class LedgerBackupSectionImporter(private val accountRepository: LedgerAccountRepository, private val transactionRepository: LedgerTransactionRepository, private val categoryAssignmentRepository: TransactionCategoryAssignmentRepository, private val tagAssignmentRepository: TransactionTagAssignmentRepository) : BackupSectionImporter {
    override val sectionId = BackupSectionId.LEDGER
    override val supportedVersions = setOf(1)
    override val dependencies = setOf(BackupSectionId.TAXONOMY)

    override fun validate(section: BackupSection, context: BackupImportContext): BackupValidationResult {
        if (section !is LedgerBackupSection) return BackupValidationResult.Invalid(BackupErrorCode.INVALID_DATA, "Expected ledger backup section")
        if (section.version !in supportedVersions) return BackupValidationResult.Invalid(BackupErrorCode.UNSUPPORTED_SECTION_VERSION, "Unsupported ledger backup version: ${section.version}")
        return try {
            val accountIds = uniqueIds(section.accounts.map { it.id }, "account")
            val movementIds = uniqueIds(section.movements.map { it.id }, "movement")
            section.movements.forEach { movement ->
                requireReference(accountIds, movement.accountId, "movement account")
                movement.categoryId?.let { requireContext(context.validationContext.containsCategory(it), "movement category", it) }
                movement.tagIds.forEach { requireContext(context.validationContext.containsTag(it), "movement tag", it) }
                movement.linkedTransactionId?.let { requireReference(movementIds, it, "linked transaction") }
                movement.splitItems.forEach { item -> item.categoryId?.let { requireContext(context.validationContext.containsCategory(it), "item category", it) } }
                TransactionType.from(movement.type)
                TransactionStatus.from(movement.status)
                CurrencyCode.from(movement.currency)
                BigDecimal(movement.amount)
            }
            if (movementIds.size != section.movements.size) throw IllegalArgumentException("Duplicate movement id")
            BackupValidationResult.Valid
        } catch (error: IllegalArgumentException) {
            BackupValidationResult.Invalid(if (error is BackupReferenceValidationException) BackupErrorCode.INVALID_REFERENCE else BackupErrorCode.INVALID_DATA, error.message ?: "Invalid ledger backup section")
        }
    }

    override fun import(section: BackupSection, context: BackupImportContext) {
        val ledger = section as? LedgerBackupSection ?: throw BackupImportException(BackupErrorCode.INVALID_DATA, "Expected ledger backup section")
        val importedAt = context.importedAt
        ledger.accounts.forEach { account ->
            val id = AccountId.from(account.id)
            val status = AccountStatus.from(account.status)
            accountRepository.save(Account(id, account.name, AccountType.from(account.type), CurrencyCode.from(account.currency), status, account.createdAt ?: importedAt, account.archivedAt ?: if (status == AccountStatus.ARCHIVED) importedAt else null))
        }
        ledger.movements.forEach { movement ->
            val transaction = movement.toDomain()
            transactionRepository.save(transaction)
            movement.categoryId?.let { categoryAssignmentRepository.upsert(com.gonezo.taxonomy.domain.TransactionCategoryAssignment.assign(transaction.id.value, CategoryId.from(it), importedAt)) }
            val tagIds = movement.tagIds.distinct().map(TagId::from)
            tagAssignmentRepository.replaceByTransactionId(transaction.id.value, tagIds.map { tagId -> com.gonezo.taxonomy.domain.TransactionTagAssignment.assign(transaction.id.value, tagId, importedAt) })
        }
    }

    private fun BackupPostedMovement.toDomain(): Transaction = Transaction(
        id = TransactionId.from(id),
        accountId = AccountId.from(accountId),
        type = TransactionType.from(type),
        amount = Money(BigDecimal(amount), CurrencyCode.from(currency).value),
        occurredAt = occurredAt,
        description = description,
        merchant = merchant,
        status = TransactionStatus.from(status),
        items = splitItems.map { item -> TransactionItem(TransactionItemId.from(item.id), item.name, Money(BigDecimal(item.amount), CurrencyCode.from(item.currency).value), item.note, item.categoryId) },
        linkedTransactionId = linkedTransactionId?.let(TransactionId::from),
    )
}

private fun uniqueIds(ids: List<String>, label: String): Set<String> {
    if (ids.any(String::isBlank)) throw IllegalArgumentException("Blank $label id")
    return ids.toSet().also { if (it.size != ids.size) throw IllegalArgumentException("Duplicate $label id") }
}

private fun requireReference(ids: Set<String>, id: String, label: String) {
    if (id !in ids) throw BackupReferenceValidationException("Invalid $label reference: $id")
}

private fun requireContext(found: Boolean, label: String, id: String) {
    if (!found) throw BackupReferenceValidationException("Invalid $label reference: $id")
}

private object BackupMappers {
    fun account(account: com.gonezo.ledger.domain.Account): BackupAccount = BackupAccount(
        id = account.id.value.toString(),
        name = account.name,
        type = account.type.value,
        currency = account.currency.value,
        status = account.status.value,
        createdAt = account.createdAt,
        archivedAt = account.archivedAt,
    )

    fun transaction(transaction: com.gonezo.ledger.domain.Transaction, categoryId: String?, tagIds: List<String>): BackupPostedMovement = BackupPostedMovement(
        id = transaction.id.value.toString(),
        accountId = transaction.accountId.value.toString(),
        type = transaction.type.value,
        status = transaction.status.value,
        occurredAt = transaction.occurredAt,
        amount = transaction.amount.amount.toPlainString(),
        currency = transaction.amount.currency,
        description = transaction.description,
        merchant = transaction.merchant,
        categoryId = categoryId,
        linkedTransactionId = transaction.linkedTransactionId?.value?.toString(),
        splitItems = transaction.items.map { item ->
            BackupSplitItem(
                id = item.id.value.toString(),
                name = item.name,
                amount = item.amount.amount.toPlainString(),
                currency = item.amount.currency,
                note = item.note,
                categoryId = item.categoryId,
            )
        },
        tagIds = tagIds.sorted(),
    )
}

private fun com.gonezo.taxonomy.domain.Category.toBackup(): BackupCategory = BackupCategory(
    id = id.value.toString(),
    name = name,
    appliesTo = appliesTo.value,
    status = status.value,
    createdAt = createdAt,
    archivedAt = archivedAt,
)

private fun com.gonezo.taxonomy.domain.Tag.toBackup(): BackupTag = BackupTag(
    id = id.value.toString(),
    name = name,
    status = status.value,
    createdAt = createdAt,
    archivedAt = archivedAt,
)
