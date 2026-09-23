package com.gonezo.taxonomy.domain

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant
import java.util.Locale

class TagAggregateTest {
    @Test
    fun `tag name normalization is trimmed locale independent and conservative`() {
        val previousLocale = Locale.getDefault()
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"))
            assertThat(TagName.normalizeTagName("  I.DÉ!  ")).isEqualTo("i.dé!")
            assertThat(TagName.normalizeTagName("i.dé!")).isEqualTo("i.dé!")
            assertThat(TagName.normalizeTagName(" I.DÉ! ")).isNotEqualTo(TagName.normalizeTagName("i dé"))
            assertThat(TagName.normalizeTagName("   ")).isEmpty()
        } finally {
            Locale.setDefault(previousLocale)
        }
    }

    @Test
    fun `creates active tag with normalized name`() {
        val tag =
            Tag.create(
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
        val archived =
            Tag
                .create(
                    id = TagId.random(),
                    name = "London",
                    createdAt = Instant.parse("2026-03-22T10:00:00Z"),
                ).archive(Instant.parse("2026-03-22T12:00:00Z"))

        assertThatThrownBy {
            archived.ensureCanAssign()
        }.isInstanceOf(IllegalStateException::class.java)
    }
}
