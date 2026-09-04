package com.gonezo.application.query

data class MovementReuseTaxonomyRef(val id: String, val name: String)
data class MovementReuseCandidateRead(val movementId: String, val title: String, val accountId: String, val accountName: String, val financialType: String, val category: MovementReuseTaxonomyRef?, val tags: List<MovementReuseTaxonomyRef>, val itemNames: List<String>, val sharePersonIds: List<String>, val posted: Boolean, val valid: Boolean, val occurredAt: String)

data class MovementReuseSuggestionsQuery(val query: String, val accountIds: Set<String>, val groupLimit: Int = 5)

data class MovementReuseSuggestionVariant(val representativeMovementId: String, val accountId: String, val accountName: String, val financialType: String, val category: MovementReuseTaxonomyRef?, val tags: List<MovementReuseTaxonomyRef>, val itemCount: Int, val shareCount: Int, val usageCount: Int, val lastUsedAt: String, val deterministicKey: String)

data class MovementReuseSuggestionGroup(val title: String, val normalizedTitle: String, val variantCount: Int, val primaryVariant: MovementReuseSuggestionVariant)

data class MovementReuseSuggestionsResult(val groups: List<MovementReuseSuggestionGroup>)

interface MovementReuseSuggestionsReadPort {
    fun readPostedCandidates(accountIds: Set<String>): Iterable<MovementReuseCandidateRead>
}

class MovementReuseSuggestionsQueryService(private val readPort: MovementReuseSuggestionsReadPort) {
    fun search(query: MovementReuseSuggestionsQuery): MovementReuseSuggestionsResult {
        val normalizedQuery = normalize(query.query)
        if (normalizedQuery.isEmpty()) return MovementReuseSuggestionsResult(emptyList())
        val candidates = readPort.readPostedCandidates(query.accountIds)
            .filter { it.posted && it.valid }
            .filter { normalize(it.title).contains(normalizedQuery) }
            .toList()
        val groups = candidates.groupBy { normalize(it.title) }
            .map { (normalizedTitle, groupCandidates) ->
                val variants = variants(groupCandidates)
                MovementReuseSuggestionGroup(
                    title = groupCandidates.first { normalize(it.title) == normalizedTitle }.title.trim(),
                    normalizedTitle = normalizedTitle,
                    variantCount = variants.size,
                    primaryVariant = variants.first(),
                )
            }
            .sortedWith(
                compareBy<MovementReuseSuggestionGroup> {
                    if (it.normalizedTitle == normalizedQuery) {
                        0
                    } else if (it.normalizedTitle.startsWith(normalizedQuery)) {
                        1
                    } else {
                        2
                    }
                }
                    .thenByDescending { it.primaryVariant.usageCount }
                    .thenByDescending { it.primaryVariant.lastUsedAt }
                    .thenBy { it.normalizedTitle },
            )
            .take(query.groupLimit.coerceAtLeast(0))
        return MovementReuseSuggestionsResult(groups)
    }

    fun variants(normalizedTitle: String, accountIds: Set<String>): List<MovementReuseSuggestionVariant> = variants(
        readPort.readPostedCandidates(accountIds)
            .filter { it.posted && it.valid && normalize(it.title) == normalize(normalizedTitle) }
            .toList(),
    )

    private fun variants(candidates: List<MovementReuseCandidateRead>): List<MovementReuseSuggestionVariant> = candidates
        .groupBy { variantKey(it) }
        .map { (key, occurrences) ->
            val representative = occurrences.maxWith(compareBy<MovementReuseCandidateRead> { it.occurredAt }.thenBy { it.movementId })
            MovementReuseSuggestionVariant(
                representativeMovementId = representative.movementId,
                accountId = representative.accountId,
                accountName = representative.accountName,
                financialType = representative.financialType,
                category = representative.category,
                tags = representative.tags.distinctBy { it.id }.sortedBy { it.id },
                itemCount = representative.itemNames.size,
                shareCount = representative.sharePersonIds.size,
                usageCount = occurrences.size,
                lastUsedAt = representative.occurredAt,
                deterministicKey = key,
            )
        }
        .sortedWith(compareByDescending<MovementReuseSuggestionVariant> { it.usageCount }.thenByDescending { it.lastUsedAt }.thenBy { it.deterministicKey })

    private fun variantKey(candidate: MovementReuseCandidateRead): String = listOf(
        candidate.accountId,
        candidate.financialType,
        candidate.category?.id.orEmpty(),
        candidate.tags.distinctBy { it.id }.map { it.id }.sorted().joinToString(","),
        candidate.itemNames.distinct().sorted().joinToString(","),
        candidate.sharePersonIds.distinct().sorted().joinToString(","),
    ).joinToString("|")

    private fun normalize(value: String): String = java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
        .replace("\\p{M}+".toRegex(), "")
        .trim()
        .replace("\\s+".toRegex(), " ")
        .lowercase()
}
