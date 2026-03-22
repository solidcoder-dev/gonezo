package com.gonezo.domain.taxonomy

import java.time.Instant

data class Category(
  val id: CategoryId,
  val name: String,
  val appliesTo: CategoryAppliesTo,
  val status: CategoryStatus,
  val createdAt: Instant,
  val archivedAt: Instant?,
) {
  init {
    require(name.isNotBlank()) { "category name is required" }
  }

  fun rename(newName: String): Category {
    require(newName.isNotBlank()) { "category name is required" }
    return copy(name = newName.trim())
  }

  fun archive(at: Instant): Category {
    if (status == CategoryStatus.ARCHIVED) {
      return this
    }
    return copy(status = CategoryStatus.ARCHIVED, archivedAt = at)
  }

  fun ensureCanAssign() {
    check(status == CategoryStatus.ACTIVE) { "archived categories cannot be assigned" }
  }

  companion object {
    fun create(
      id: CategoryId,
      name: String,
      appliesTo: CategoryAppliesTo,
      createdAt: Instant,
    ): Category = Category(
      id = id,
      name = name.trim(),
      appliesTo = appliesTo,
      status = CategoryStatus.ACTIVE,
      createdAt = createdAt,
      archivedAt = null,
    )
  }
}
