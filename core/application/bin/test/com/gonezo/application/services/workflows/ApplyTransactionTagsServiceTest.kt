package com.gonezo.application.orchestration

import com.gonezo.ledger.domain.TransactionId
import com.gonezo.taxonomy.application.CreateTagCommand
import com.gonezo.taxonomy.application.CreateTagUC
import com.gonezo.taxonomy.application.ReplaceTransactionTagsCommand
import com.gonezo.taxonomy.application.ReplaceTransactionTagsUC
import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.ports.TagRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Instant

class ApplyTransactionTagsServiceTest {

  @Test
  fun `creates missing tags and applies all deduplicated tags`() {
    val existingTag = Tag.create(TagId.random(), "london", Instant.parse("2026-03-22T10:00:00Z"))
    val repository = InMemoryTagRepository(existingTag)
    val createdTagId = TagId.random()
    val createTagUC = RecordingCreateTagUC(createdTagId)
    val replaceTagsUC = RecordingReplaceTransactionTagsUC()
    val service = ApplyTransactionTagsService(repository, createTagUC, replaceTagsUC)
    val txId = TransactionId.random()

    val result = service.execute(
      ApplyTransactionTagsCommand(
        transactionId = txId,
        tagNames = listOf("london", "trip-2026", "LONDON", " "),
        requestedAt = Instant.parse("2026-03-22T12:00:00Z"),
      ),
    )

    assertThat(createTagUC.calls).hasSize(1)
    assertThat(createTagUC.calls.single().name).isEqualTo("trip-2026")
    assertThat(replaceTagsUC.calls).hasSize(1)
    assertThat(replaceTagsUC.calls.single().tagIds).containsExactlyInAnyOrder(existingTag.id, createdTagId)
    assertThat(result.tagIds).containsExactlyInAnyOrder(existingTag.id, createdTagId)
  }
}

private class RecordingCreateTagUC(
  private val generatedTagId: TagId,
) : CreateTagUC {
  val calls = mutableListOf<CreateTagCommand>()

  override fun execute(command: CreateTagCommand): TagId {
    calls += command
    return generatedTagId
  }
}

private class RecordingReplaceTransactionTagsUC : ReplaceTransactionTagsUC {
  val calls = mutableListOf<ReplaceTransactionTagsCommand>()

  override fun execute(command: ReplaceTransactionTagsCommand) {
    calls += command
  }
}

private class InMemoryTagRepository(
  private vararg val tags: Tag,
) : TagRepository {
  override fun save(tag: Tag) = Unit

  override fun findById(id: TagId): Tag? = tags.firstOrNull { it.id == id }

  override fun findByIds(ids: Collection<TagId>): Map<TagId, Tag> =
    ids.mapNotNull { id -> tags.firstOrNull { it.id == id }?.let { id to it } }.toMap()

  override fun findByNormalizedName(name: String): Tag? =
    tags.firstOrNull { it.name.equals(name.trim(), ignoreCase = true) }

  override fun listAll(): List<Tag> = tags.toList()
}
