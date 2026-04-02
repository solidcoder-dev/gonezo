package com.gonezo.application.orchestration

import com.gonezo.application.orchestration.ApplyTransactionTagsCommand
import com.gonezo.application.orchestration.ApplyTransactionTagsResult
import com.gonezo.application.orchestration.ApplyTransactionTagsUC
import com.gonezo.taxonomy.application.CreateTagCommand
import com.gonezo.taxonomy.application.CreateTagUC
import com.gonezo.taxonomy.application.ReplaceTransactionTagsCommand
import com.gonezo.taxonomy.application.ReplaceTransactionTagsUC
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.ports.TagRepository

class ApplyTransactionTagsService(
  private val tagRepository: TagRepository,
  private val createTagUC: CreateTagUC,
  private val replaceTransactionTagsUC: ReplaceTransactionTagsUC,
) : ApplyTransactionTagsUC {
  override fun execute(command: ApplyTransactionTagsCommand): ApplyTransactionTagsResult {
    val normalizedNames = command.tagNames
      .asSequence()
      .map(String::trim)
      .filter(String::isNotBlank)
      .map { it.lowercase() to it }
      .distinctBy { it.first }
      .toList()

    val resolvedTagIds = normalizedNames.map { (_, rawName) ->
      val existing = tagRepository.findByNormalizedName(rawName)
      if (existing != null) {
        existing.ensureCanAssign()
        existing.id
      } else {
        createTagUC.execute(
          CreateTagCommand(
            name = rawName,
            createdAt = command.requestedAt,
          ),
        )
      }
    }

    replaceTransactionTagsUC.execute(
      ReplaceTransactionTagsCommand(
        transactionId = command.transactionId.value,
        tagIds = resolvedTagIds,
        assignedAt = command.requestedAt,
      ),
    )

    return ApplyTransactionTagsResult(
      tagIds = resolvedTagIds.distinctBy(TagId::toString),
    )
  }
}
