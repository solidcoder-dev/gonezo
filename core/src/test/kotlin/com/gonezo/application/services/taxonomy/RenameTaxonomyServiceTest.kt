package com.gonezo.taxonomy.application

import com.gonezo.taxonomy.domain.Category
import com.gonezo.taxonomy.domain.CategoryAppliesTo
import com.gonezo.taxonomy.domain.CategoryId
import com.gonezo.taxonomy.domain.Tag
import com.gonezo.taxonomy.domain.TagId
import com.gonezo.taxonomy.domain.ports.CategoryRepository
import com.gonezo.taxonomy.domain.ports.TagRepository
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant

class RenameTaxonomyServiceTest {

  @Test
  fun `renames category without changing its identity`() {
    val category = Category.create(
      id = CategoryId.random(),
      name = "Food",
      appliesTo = CategoryAppliesTo.EXPENSE,
      createdAt = Instant.parse("2026-03-22T10:00:00Z"),
    )
    val repository = MutableCategoryRepository(category)
    val service = RenameCategoryService(repository)

    service.execute(RenameCategoryCommand(category.id, " Groceries "))

    val renamed = repository.findById(category.id)
    assertThat(renamed).isNotNull
    assertThat(renamed!!.id).isEqualTo(category.id)
    assertThat(renamed.name).isEqualTo("Groceries")
  }

  @Test
  fun `does not allow blank category rename`() {
    val category = Category.create(
      id = CategoryId.random(),
      name = "Food",
      appliesTo = CategoryAppliesTo.EXPENSE,
      createdAt = Instant.parse("2026-03-22T10:00:00Z"),
    )
    val service = RenameCategoryService(MutableCategoryRepository(category))

    assertThatThrownBy {
      service.execute(RenameCategoryCommand(category.id, "   "))
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `renames tag without changing its identity`() {
    val tag = Tag.create(
      id = TagId.random(),
      name = "travel",
      createdAt = Instant.parse("2026-03-22T10:00:00Z"),
    )
    val repository = MutableTagRepository(tag)
    val service = RenameTagService(repository)

    service.execute(RenameTagCommand(tag.id, " trip "))

    val renamed = repository.findById(tag.id)
    assertThat(renamed).isNotNull
    assertThat(renamed!!.id).isEqualTo(tag.id)
    assertThat(renamed.name).isEqualTo("trip")
  }

  @Test
  fun `does not allow blank tag rename`() {
    val tag = Tag.create(
      id = TagId.random(),
      name = "travel",
      createdAt = Instant.parse("2026-03-22T10:00:00Z"),
    )
    val service = RenameTagService(MutableTagRepository(tag))

    assertThatThrownBy {
      service.execute(RenameTagCommand(tag.id, "   "))
    }.isInstanceOf(IllegalArgumentException::class.java)
  }
}

private class MutableCategoryRepository(
  vararg categories: Category,
) : CategoryRepository {
  private val values = categories.associateBy { it.id }.toMutableMap()

  override fun save(category: Category) {
    values[category.id] = category
  }

  override fun findById(id: CategoryId): Category? = values[id]

  override fun findByIds(ids: Collection<CategoryId>): Map<CategoryId, Category> =
    ids.mapNotNull { id -> values[id]?.let { id to it } }.toMap()

  override fun findByNormalizedNameAndAppliesTo(name: String, appliesTo: CategoryAppliesTo): Category? =
    values.values.firstOrNull { it.name.equals(name.trim(), ignoreCase = true) && it.appliesTo == appliesTo }

  override fun listAll(): List<Category> = values.values.toList()
}

private class MutableTagRepository(
  vararg tags: Tag,
) : TagRepository {
  private val values = tags.associateBy { it.id }.toMutableMap()

  override fun save(tag: Tag) {
    values[tag.id] = tag
  }

  override fun findById(id: TagId): Tag? = values[id]

  override fun findByIds(ids: Collection<TagId>): Map<TagId, Tag> =
    ids.mapNotNull { id -> values[id]?.let { id to it } }.toMap()

  override fun findByNormalizedName(name: String): Tag? =
    values.values.firstOrNull { it.name.equals(name.trim(), ignoreCase = true) }

  override fun listAll(): List<Tag> = values.values.toList()
}
