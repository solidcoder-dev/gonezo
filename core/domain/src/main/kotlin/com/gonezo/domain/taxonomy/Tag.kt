package com.gonezo.taxonomy.domain

import java.time.Instant

data class Tag(
  val id: TagId,
  val name: String,
  val status: TagStatus,
  val createdAt: Instant,
  val archivedAt: Instant?,
) {
  init {
    require(name.isNotBlank()) { "tag name is required" }
  }

  fun rename(newName: String): Tag {
    require(newName.isNotBlank()) { "tag name is required" }
    return copy(name = newName.trim())
  }

  fun archive(at: Instant): Tag {
    if (status == TagStatus.ARCHIVED) {
      return this
    }
    return copy(status = TagStatus.ARCHIVED, archivedAt = at)
  }

  fun ensureCanAssign() {
    check(status == TagStatus.ACTIVE) { "archived tags cannot be assigned" }
  }

  companion object {
    fun create(
      id: TagId,
      name: String,
      createdAt: Instant,
    ): Tag = Tag(
      id = id,
      name = name.trim(),
      status = TagStatus.ACTIVE,
      createdAt = createdAt,
      archivedAt = null,
    )
  }
}
