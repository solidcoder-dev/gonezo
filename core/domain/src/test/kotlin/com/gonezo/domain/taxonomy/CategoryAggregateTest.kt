package com.gonezo.taxonomy.domain

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant

class CategoryAggregateTest {

  @Test
  fun `creates active category with normalized name`() {
    val category = Category.create(
      id = CategoryId.random(),
      name = "  groceries  ",
      appliesTo = CategoryAppliesTo.EXPENSE,
      createdAt = Instant.parse("2026-03-22T10:00:00Z"),
    )

    assertThat(category.name).isEqualTo("groceries")
    assertThat(category.status).isEqualTo(CategoryStatus.ACTIVE)
    assertThat(category.archivedAt).isNull()
  }

  @Test
  fun `does not allow blank category name`() {
    assertThatThrownBy {
      Category.create(
        id = CategoryId.random(),
        name = "  ",
        appliesTo = CategoryAppliesTo.INCOME,
        createdAt = Instant.parse("2026-03-22T10:00:00Z"),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `archived category cannot be assigned`() {
    val archived = Category.create(
      id = CategoryId.random(),
      name = "Salary",
      appliesTo = CategoryAppliesTo.INCOME,
      createdAt = Instant.parse("2026-03-22T10:00:00Z"),
    ).archive(Instant.parse("2026-03-22T12:00:00Z"))

    assertThatThrownBy {
      archived.ensureCanAssign()
    }.isInstanceOf(IllegalStateException::class.java)
  }
}
