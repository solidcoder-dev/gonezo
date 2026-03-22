package com.gonezo.taxonomy.application

import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.TagStatus
import com.gonezo.taxonomy.domain.TransactionTagAssignment
import com.gonezo.taxonomy.domain.ports.TagRepository
import com.gonezo.taxonomy.domain.ports.TransactionTagAssignmentRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.UUID

class ReplaceTransactionTagsServiceTest {

  @Test
  fun `replaces tags for transaction`() {
    val travel = Tag.create(TagId.random(), "travel", Instant.parse("2026-03-22T10:00:00Z"))
    val london = Tag.create(TagId.random(), "london", Instant.parse("2026-03-22T10:01:00Z"))
    val tagRepository = InMemoryTagRepository(travel, london)
    val assignmentRepository = InMemoryTagAssignmentRepository()
    val service = ReplaceTransactionTagsService(tagRepository, assignmentRepository)
    val txId = UUID.randomUUID()

    service.execute(
      ReplaceTransactionTagsCommand(
        transactionId = txId,
        tagIds = listOf(travel.id, london.id, london.id),
        assignedAt = Instant.parse("2026-03-22T12:00:00Z"),
      ),
    )

    val assigned = assignmentRepository.findByTransactionId(txId)
    assertThat(assigned.map { it.tagId }).containsExactlyInAnyOrder(travel.id, london.id)
  }

  @Test
  fun `rejects archived tag`() {
    val archived = Tag(
      id = TagId.random(),
      name = "old-trip",
      status = TagStatus.ARCHIVED,
      createdAt = Instant.parse("2026-03-22T10:00:00Z"),
      archivedAt = Instant.parse("2026-03-22T11:00:00Z"),
    )
    val tagRepository = InMemoryTagRepository(archived)
    val assignmentRepository = InMemoryTagAssignmentRepository()
    val service = ReplaceTransactionTagsService(tagRepository, assignmentRepository)

    assertThatThrownBy {
      service.execute(
        ReplaceTransactionTagsCommand(
          transactionId = UUID.randomUUID(),
          tagIds = listOf(archived.id),
          assignedAt = Instant.parse("2026-03-22T12:00:00Z"),
        ),
      )
    }.isInstanceOf(IllegalStateException::class.java)
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

private class InMemoryTagAssignmentRepository : TransactionTagAssignmentRepository {
  private val values = linkedMapOf<UUID, List<TransactionTagAssignment>>()

  override fun replaceByTransactionId(transactionId: UUID, assignments: List<TransactionTagAssignment>) {
    values[transactionId] = assignments
  }

  override fun findByTransactionId(transactionId: UUID): List<TransactionTagAssignment> =
    values[transactionId] ?: emptyList()

  override fun findByTransactionIds(transactionIds: Collection<UUID>): Map<UUID, List<TransactionTagAssignment>> =
    transactionIds.mapNotNull { id -> values[id]?.let { id to it } }.toMap()
}
