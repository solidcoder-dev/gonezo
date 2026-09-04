package com.gonezo.application.query

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class MovementReuseSuggestionsQueryTest {
    @Test
    fun `groups posted valid occurrences and ranks primary variant`() {
        val rows = buildList {
            repeat(7) { add(row("main-$it", "Main")) }
            repeat(3) { add(row("revolut-$it", "Revolut", accountId = "revolut")) }
            add(row("cash", "Cash", accountId = "cash"))
            add(row("expected", "Expected", posted = false))
            add(row("voided", "Voided", valid = false))
        }
        val query = MovementReuseSuggestionsQueryService(object : MovementReuseSuggestionsReadPort {
            override fun readPostedCandidates(accountIds: Set<String>) = rows
        })

        val result = query.search(MovementReuseSuggestionsQuery(" MERC ", setOf("main", "revolut", "cash")))

        assertThat(result.groups).hasSize(1)
        assertThat(result.groups.single().variantCount).isEqualTo(3)
        assertThat(result.groups.single().primaryVariant.accountName).isEqualTo("Main")
        assertThat(result.groups.single().primaryVariant.usageCount).isEqualTo(7)
        val limitedRows = (1..6).map { row("limited-$it", "Main", title = "Mercadona $it") }
        val limitedQuery = MovementReuseSuggestionsQueryService(object : MovementReuseSuggestionsReadPort {
            override fun readPostedCandidates(accountIds: Set<String>) = limitedRows
        })
        assertThat(limitedQuery.search(MovementReuseSuggestionsQuery("merc", emptySet(), 5)).groups).hasSize(5)
    }

    @Test
    fun `dto contains reusable metadata but no amount or date field`() {
        val variant = MovementReuseSuggestionsQueryService(object : MovementReuseSuggestionsReadPort {
            override fun readPostedCandidates(accountIds: Set<String>) = listOf(row("one", "Main"))
        }).search(MovementReuseSuggestionsQuery("merc", emptySet())).groups.single().primaryVariant
        assertThat(variant.itemCount).isZero()
        assertThat(variant.shareCount).isZero()
    }

    @Test
    fun `keeps taxonomy ids and presentation names`() {
        val variant = MovementReuseSuggestionsQueryService(object : MovementReuseSuggestionsReadPort {
            override fun readPostedCandidates(accountIds: Set<String>) = listOf(row("one", "Main"))
        }).search(MovementReuseSuggestionsQuery("merc", emptySet())).groups.single().primaryVariant
        assertThat(variant.category).isEqualTo(MovementReuseTaxonomyRef("groceries", "Groceries"))
        assertThat(variant.tags).containsExactly(MovementReuseTaxonomyRef("food", "Food"))
        assertThat(variant.tags).allMatch { it.name != it.id }
    }

    private fun row(id: String, accountName: String, accountId: String = "main", posted: Boolean = true, valid: Boolean = true, title: String = " Mercadona ") = MovementReuseCandidateRead(
        movementId = id, title = title, accountId = accountId, accountName = accountName,
        financialType = "expense", category = MovementReuseTaxonomyRef("groceries", "Groceries"),
        tags = listOf(MovementReuseTaxonomyRef("food", "Food")), itemNames = emptyList(), sharePersonIds = emptyList(),
        posted = posted, valid = valid, occurredAt = "2026-01-01T00:00:00Z",
    )
}
