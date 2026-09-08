package com.gonezo.application.orchestration.backup

import com.gonezo.ledger.domain.Account
import com.gonezo.ledger.domain.AccountId
import com.gonezo.ledger.domain.AccountStatus
import com.gonezo.ledger.domain.AccountType
import com.gonezo.ledger.domain.CurrencyCode
import com.gonezo.ledger.domain.ports.LedgerAccountRepository
import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.CategoryStatus
import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TagStatus
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TagRepository
import java.time.Instant

class BackupMasterDataImporter(
    private val accountRepository: LedgerAccountRepository,
    private val categoryRepository: CategoryRepository,
    private val tagRepository: TagRepository,
) {
    fun importAccounts(accounts: List<BackupAccount>, importedAt: Instant) = accounts.forEach { item ->
        val status = AccountStatus.from(item.status)
        accountRepository.save(Account(AccountId.from(item.id), item.name, AccountType.from(item.type), CurrencyCode.from(item.currency), status, importedAt, if (status == AccountStatus.ARCHIVED) importedAt else null))
    }

    fun importCategories(categories: List<BackupCategory>, importedAt: Instant) = categories.forEach { item ->
        val status = CategoryStatus.from(item.status)
        categoryRepository.save(Category(CategoryId.from(item.id), item.name, CategoryAppliesTo.from(item.appliesTo), status, importedAt, if (status == CategoryStatus.ARCHIVED) importedAt else null))
    }

    fun importTags(tags: List<BackupTag>, importedAt: Instant) = tags.forEach { item ->
        val status = TagStatus.from(item.status)
        tagRepository.save(Tag(TagId.from(item.id), item.name, status, importedAt, if (status == TagStatus.ARCHIVED) importedAt else null))
    }
}
