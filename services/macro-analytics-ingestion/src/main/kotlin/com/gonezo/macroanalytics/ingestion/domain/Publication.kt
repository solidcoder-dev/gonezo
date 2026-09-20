package com.gonezo.macroanalytics.ingestion.domain

import org.json.JSONObject
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

@JvmInline
value class ContributorId(val value: String)

@JvmInline
value class AnalyticsPeriod(val value: String)

@JvmInline
value class PublicationRevision(val value: Int)

@JvmInline
value class SchemaVersion(val value: Int)

data class ProtocolVersion(val value: Int)

data class ContributionDimensions(val countryCode: String, val regionCode: String, val sex: String, val ageBand: String)

data class FinancialBucket(val source: String, val kind: String, val amount: String, val count: Int)

data class FinancialCurrency(val currency: String, val buckets: List<FinancialBucket>)

data class FinancialContribution(val currencies: List<FinancialCurrency>)

data class CategoryBucket(val source: String, val kind: String, val category: String, val amount: String)

data class CategoryCurrency(val currency: String, val buckets: List<CategoryBucket>)

data class CategoryContribution(val currencies: List<CategoryCurrency>)

data class MacroAnalyticsContribution(val schemaVersion: SchemaVersion, val dimensions: ContributionDimensions, val financial: FinancialContribution, val categories: CategoryContribution? = null)

data class ValidatedMacroAnalyticsPublication(val protocolVersion: ProtocolVersion, val contributorId: ContributorId, val period: AnalyticsPeriod, val revision: PublicationRevision, val contribution: MacroAnalyticsContribution) {
    fun canonicalJson(): String = buildString {
        append("{\"protocolVersion\":${protocolVersion.value}")
        append(",\"contributorId\":${JSONObject.quote(contributorId.value)}")
        append(",\"period\":${JSONObject.quote(period.value)}")
        append(",\"revision\":${revision.value}")
        append(",\"contribution\":{\"schemaVersion\":${contribution.schemaVersion.value}")
        append(",\"dimensions\":{")
        append("\"countryCode\":${JSONObject.quote(contribution.dimensions.countryCode)}")
        append(",\"regionCode\":${JSONObject.quote(contribution.dimensions.regionCode)}")
        append(",\"sex\":${JSONObject.quote(contribution.dimensions.sex)}")
        append(",\"ageBand\":${JSONObject.quote(contribution.dimensions.ageBand)}}")
        append(",\"financial\":{\"currencies\":[")
        append(
            contribution.financial.currencies.sortedBy { it.currency }.joinToString(",") { currency ->
                "{\"currency\":${JSONObject.quote(currency.currency)},\"buckets\":[" +
                    currency.buckets.sortedWith(compareBy<FinancialBucket> { SOURCES.indexOf(it.source) }.thenBy { KINDS.indexOf(it.kind) }).joinToString(",") { bucket ->
                        "{\"source\":${JSONObject.quote(bucket.source)},\"kind\":${JSONObject.quote(bucket.kind)}," +
                            "\"amount\":${JSONObject.quote(bucket.amount)},\"count\":${bucket.count}}"
                    } + "]}"
            },
        )
        append("]}")
        if (contribution.schemaVersion.value == 2) {
            append(",\"categories\":{\"currencies\":[")
            append(contribution.categories?.currencies.orEmpty().sortedBy { it.currency }.joinToString(",") { currency ->
                "{\"currency\":${JSONObject.quote(currency.currency)},\"buckets\":[" +
                    currency.buckets.sortedWith(compareBy<CategoryBucket> { it.source }.thenBy { it.kind }.thenBy { it.category }).joinToString(",") { bucket ->
                        "{\"source\":${JSONObject.quote(bucket.source)},\"kind\":${JSONObject.quote(bucket.kind)}," +
                            "\"category\":${JSONObject.quote(bucket.category)},\"amount\":${JSONObject.quote(bucket.amount)}}"
                    } + "]}"
            })
            append("]}")
        }
        append("}}")
    }

    fun fingerprint(): String = MessageDigest.getInstance("SHA-256")
        .digest(canonicalJson().toByteArray(StandardCharsets.UTF_8))
        .joinToString("") { byte -> "%02x".format(byte) }

    private companion object {
        val SOURCES = listOf("POSTED", "EXPECTED", "SCHEDULED")
        val KINDS = listOf("INCOME", "EXPENSE", "TRANSFER_IN", "TRANSFER_OUT")
    }
}

data class LatestPublicationKey(val contributorId: ContributorId, val period: AnalyticsPeriod)

enum class PublicationIngestionOutcome { ACCEPTED, UPDATED, ALREADY_CURRENT, STALE, REVISION_CONFLICT }

data class PublicationIngestionResult(val outcome: PublicationIngestionOutcome, val currentRevision: PublicationRevision)
