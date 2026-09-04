package com.gonezo.application.query

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class MovementReuseTemplateQueryTest {
    @Test
    fun `returns reusable data without historical values`() {
        val expected = MovementReuseTemplateRead("movement-1", "Mercadona", "main", "Main", "expense",
            MovementReuseTemplateTaxonomyRef("cat-1", "Groceries"), listOf(MovementReuseTemplateTaxonomyRef("tag-1", "Food")),
            listOf("Fruit"), listOf(MovementReuseTemplatePerson("person-1", "Alex", null, true, 2)), "revolut", true)
        val service = MovementReuseTemplateQueryService(object : MovementReuseTemplateReadPort {
            override fun readTemplate(representativeMovementId: String) = expected.takeIf { it.movementId == representativeMovementId }
        })

        val result = service.get(MovementReuseTemplateQuery("movement-1"))

        assertThat(result).isEqualTo(expected)
        assertThat(result).extracting("title", "accountId", "financialType", "itemNames", "targetAccountId", "ignored")
            .containsExactly("Mercadona", "main", "expense", listOf("Fruit"), "revolut", true)
    }
}
