package com.gonezo.taxonomy.domain

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant

class TagAggregateTest {

  @Test
  fun `creates active tag with normalized name`() {
    val tag = Tag.create(
      id = TagId.random(),
      name = "  London  ",
      createdAt = Instant.parse("2026-03-22T10:00:00Z"),
    )

    assertThat(tag.name).isEqualTo("London")
    assertThat(tag.status).isEqualTo(TagStatus.ACTIVE)
    assertThat(tag.archivedAt).isNull()
  }

  @Test
  fun `does not allow blank tag name`() {
    assertThatThrownBy {
      Tag.create(
        id = TagId.random(),
        name = "  ",
        createdAt = Instant.parse("2026-03-22T10:00:00Z"),
      )
    }.isInstanceOf(IllegalArgumentException::class.java)
  }

  @Test
  fun `archived tag cannot be assigned`() {
    val archived = Tag.create(
      id = TagId.random(),
      name = "London",
      createdAt = Instant.parse("2026-03-22T10:00:00Z"),
    ).archive(Instant.parse("2026-03-22T12:00:00Z"))

    assertThatThrownBy {
      archived.ensureCanAssign()
    }.isInstanceOf(IllegalStateException::class.java)
  }
}
