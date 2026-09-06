package com.gonezo.application.orchestration

import com.gonezo.application.orchestration.ApplyTransactionTagsCommand
import com.gonezo.application.orchestration.ApplyTransactionTagsResult
import com.gonezo.application.orchestration.ApplyTransactionTagsUC
import com.gonezo.taxonomy.application.CreateTagCommand
import com.gonezo.taxonomy.application.CreateTagUC
import com.gonezo.taxonomy.application.ReplaceTransactionItemTagsCommand
import com.gonezo.taxonomy.application.ReplaceTransactionItemTagsUC
import com.gonezo.taxonomy.application.ReplaceTransactionTagsCommand
import com.gonezo.taxonomy.application.ReplaceTransactionTagsUC
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.ports.TagRepository
import java.time.Instant

class AssignableTagNameResolver(private val tagRepository: TagRepository, private val createTagUC: CreateTagUC) {
    fun resolve(names: List<String>, requestedAt: Instant): List<TagId> {
        val normalizedNames = names.asSequence().map(String::trim).filter(String::isNotBlank).map { it.lowercase() to it }.distinctBy { it.first }.toList()
        return normalizedNames.map { (_, rawName) ->
            val existing = tagRepository.findByNormalizedName(rawName)
            if (existing != null) {
                existing.ensureCanAssign()
                existing.id
            } else {
                createTagUC.execute(CreateTagCommand(rawName, requestedAt))
            }
        }.distinctBy(TagId::toString)
    }
}

class ApplyTransactionTagsService(private val replaceTransactionTagsUC: ReplaceTransactionTagsUC, private val resolver: AssignableTagNameResolver) : ApplyTransactionTagsUC {
    constructor(tagRepository: TagRepository, createTagUC: CreateTagUC, replaceTransactionTagsUC: ReplaceTransactionTagsUC) : this(replaceTransactionTagsUC, AssignableTagNameResolver(tagRepository, createTagUC))

    override fun execute(command: ApplyTransactionTagsCommand): ApplyTransactionTagsResult {
        val resolvedTagIds = resolver.resolve(command.tagNames, command.requestedAt)

        replaceTransactionTagsUC.execute(
            ReplaceTransactionTagsCommand(
                transactionId = command.transactionId.value,
                tagIds = resolvedTagIds,
                assignedAt = command.requestedAt,
            ),
        )

        return ApplyTransactionTagsResult(
            tagIds = resolvedTagIds,
        )
    }
}

class ApplyTransactionItemTagsService(private val replaceTransactionItemTagsUC: ReplaceTransactionItemTagsUC, private val resolver: AssignableTagNameResolver) : ApplyTransactionItemTagsUC {
    override fun execute(command: ApplyTransactionItemTagsCommand): ApplyTransactionTagsResult {
        val resolvedTagIds = resolver.resolve(command.tagNames, command.requestedAt)
        replaceTransactionItemTagsUC.execute(ReplaceTransactionItemTagsCommand(command.transactionItemId.value, resolvedTagIds, command.requestedAt))
        return ApplyTransactionTagsResult(resolvedTagIds)
    }
}
