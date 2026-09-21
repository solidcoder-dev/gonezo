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

data class RecurringBucket(val source: String, val kind: String, val amount: String, val occurrenceCount: Int, val seriesCount: Int)

data class RecurringCurrency(val currency: String, val buckets: List<RecurringBucket>)

data class RecurringContribution(val currencies: List<RecurringCurrency>)

data class SharingBucket(val source: String, val kind: String, val fullAmount: String, val personalAmount: String, val participantAllocatedAmount: String, val settlementRequiredAmount: String, val movementCount: Int, val participantCount: Int, val settlementParticipantCount: Int)

data class SharingCurrency(val currency: String, val buckets: List<SharingBucket>)

data class SharingContribution(val currencies: List<SharingCurrency>)

data class MerchantBucket(val source: String, val kind: String, val merchant: String, val amount: String, val movementCount: Int)

data class MerchantCurrency(val currency: String, val buckets: List<MerchantBucket>)

data class MerchantContribution(val catalogVersion: Int, val currencies: List<MerchantCurrency>)

data class MacroAnalyticsContribution(val schemaVersion: SchemaVersion, val dimensions: ContributionDimensions, val financial: FinancialContribution, val categories: CategoryContribution? = null, val recurring: RecurringContribution? = null, val sharing: SharingContribution? = null, val merchants: MerchantContribution? = null)

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
        if (contribution.schemaVersion.value >= 2) {
            append(",\"categories\":{\"currencies\":[")
            append(
                contribution.categories?.currencies.orEmpty().sortedBy { it.currency }.joinToString(",") { currency ->
                    "{\"currency\":${JSONObject.quote(currency.currency)},\"buckets\":[" +
                        currency.buckets.sortedWith(compareBy<CategoryBucket> { it.source }.thenBy { it.kind }.thenBy { it.category }).joinToString(",") { bucket ->
                            "{\"source\":${JSONObject.quote(bucket.source)},\"kind\":${JSONObject.quote(bucket.kind)}," +
                                "\"category\":${JSONObject.quote(bucket.category)},\"amount\":${JSONObject.quote(bucket.amount)}}"
                        } + "]}"
                },
            )
            append("]}")
        }
        if (contribution.schemaVersion.value >= 3) {
            append(",\"recurring\":{\"currencies\":[")
            append(
                contribution.recurring?.currencies.orEmpty().sortedBy { it.currency }.joinToString(",") { currency ->
                    "{\"currency\":${JSONObject.quote(currency.currency)},\"buckets\":[" +
                        currency.buckets.sortedWith(compareBy<RecurringBucket> { it.source }.thenBy { it.kind }).joinToString(",") { bucket ->
                            "{\"source\":${JSONObject.quote(bucket.source)},\"kind\":${JSONObject.quote(bucket.kind)}," +
                                "\"amount\":${JSONObject.quote(bucket.amount)},\"occurrenceCount\":${bucket.occurrenceCount},\"seriesCount\":${bucket.seriesCount}}"
                        } + "]}"
                },
            )
            append("]}")
        }
        if (contribution.schemaVersion.value >= 4) {
            append(",\"sharing\":{\"currencies\":[")
            append(
                contribution.sharing?.currencies.orEmpty().sortedBy { it.currency }.joinToString(",") { currency ->
                    "{\"currency\":${JSONObject.quote(currency.currency)},\"buckets\":[" +
                        currency.buckets.sortedWith(compareBy<SharingBucket> { it.source }.thenBy { it.kind }).joinToString(",") { bucket ->
                            "{\"source\":${JSONObject.quote(bucket.source)},\"kind\":${JSONObject.quote(bucket.kind)}," +
                                "\"fullAmount\":${JSONObject.quote(bucket.fullAmount)},\"personalAmount\":${JSONObject.quote(bucket.personalAmount)}," +
                                "\"participantAllocatedAmount\":${JSONObject.quote(bucket.participantAllocatedAmount)},\"settlementRequiredAmount\":${JSONObject.quote(bucket.settlementRequiredAmount)}," +
                                "\"movementCount\":${bucket.movementCount},\"participantCount\":${bucket.participantCount},\"settlementParticipantCount\":${bucket.settlementParticipantCount}}"
                        } + "]}"
                },
            )
            append("]}")
        }
        if (contribution.schemaVersion.value >= 5) {
            append(",\"merchants\":{\"catalogVersion\":${contribution.merchants?.catalogVersion ?: 0},\"currencies\":[")
            append(
                contribution.merchants?.currencies.orEmpty().sortedBy { it.currency }.joinToString(",") { currency ->
                    "{\"currency\":${JSONObject.quote(currency.currency)},\"buckets\":[" +
                        currency.buckets.sortedWith(compareBy<MerchantBucket> { it.source }.thenBy { it.kind }.thenBy { it.merchant }).joinToString(",") { bucket ->
                            "{\"source\":${JSONObject.quote(bucket.source)},\"kind\":${JSONObject.quote(bucket.kind)}," +
                                "\"merchant\":${JSONObject.quote(bucket.merchant)},\"amount\":${JSONObject.quote(bucket.amount)},\"movementCount\":${bucket.movementCount}}"
                        } + "]}"
                },
            )
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
