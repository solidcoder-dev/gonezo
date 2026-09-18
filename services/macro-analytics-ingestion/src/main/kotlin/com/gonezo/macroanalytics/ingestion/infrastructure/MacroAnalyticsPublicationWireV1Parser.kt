package com.gonezo.macroanalytics.ingestion.infrastructure

import com.gonezo.macroanalytics.ingestion.domain.AnalyticsPeriod
import com.gonezo.macroanalytics.ingestion.domain.ContributionDimensions
import com.gonezo.macroanalytics.ingestion.domain.ContributorId
import com.gonezo.macroanalytics.ingestion.domain.FinancialBucket
import com.gonezo.macroanalytics.ingestion.domain.FinancialContribution
import com.gonezo.macroanalytics.ingestion.domain.FinancialCurrency
import com.gonezo.macroanalytics.ingestion.domain.MacroAnalyticsContribution
import com.gonezo.macroanalytics.ingestion.domain.ProtocolVersion
import com.gonezo.macroanalytics.ingestion.domain.PublicationRevision
import com.gonezo.macroanalytics.ingestion.domain.SchemaVersion
import com.gonezo.macroanalytics.ingestion.domain.ValidatedMacroAnalyticsPublication
import org.json.JSONArray
import org.json.JSONObject

class UnsupportedProtocolVersion(val version: Int) : IllegalArgumentException("Unsupported protocol version: $version")

class UnsupportedSchemaVersion(val version: Int) : IllegalArgumentException("Unsupported contribution schema version: $version")

class MacroAnalyticsPublicationWireV1Parser {
    fun parse(json: String): ValidatedMacroAnalyticsPublication {
        val root = JSONObject(json)
        root.requireKeys("protocolVersion", "contributorId", "period", "revision", "contribution")
        val protocolVersion = root.requiredInt("protocolVersion")
        if (protocolVersion != 1) throw UnsupportedProtocolVersion(protocolVersion)
        val contributorId = root.requiredString("contributorId").also { require(it.isNotBlank()) }
        val period = root.requiredString("period").also { require(PERIOD.matches(it)) }
        val revision = root.requiredInt("revision").also { require(it >= 1) }
        val contribution = root.requiredObject("contribution")
        contribution.requireKeys("schemaVersion", "dimensions", "financial")
        val schemaVersion = contribution.requiredInt("schemaVersion")
        if (schemaVersion != 1) throw UnsupportedSchemaVersion(schemaVersion)

        val dimensions = contribution.requiredObject("dimensions").also {
            it.requireKeys("countryCode", "regionCode", "sex", "ageBand")
        }
        val country = dimensions.requiredString("countryCode").also { require(COUNTRY.matches(it)) }
        val region = dimensions.requiredString("regionCode").also { require(it.isNotBlank()) }
        val sex = dimensions.requiredString("sex").also { require(it in SEXES) }
        val ageBand = dimensions.requiredString("ageBand").also { require(it in AGE_BANDS) }
        val financial = contribution.requiredObject("financial").also { it.requireKeys("currencies") }
        val currencies = financial.requiredArray("currencies").mapCurrencies { item ->
            val currency = item as JSONObject
            currency.requireKeys("currency", "buckets")
            val code = currency.requiredString("currency").also { require(CURRENCY.matches(it)) }
            val buckets = currency.requiredArray("buckets").mapBuckets { bucketItem ->
                val bucket = bucketItem as JSONObject
                bucket.requireKeys("source", "kind", "amount", "count")
                val source = bucket.requiredString("source").also { require(it in SOURCES) }
                val kind = bucket.requiredString("kind").also { require(it in KINDS) }
                val amount = bucket.requiredString("amount").also { require(AMOUNT.matches(it)) }
                val count = bucket.requiredInt("count").also { require(it >= 1) }
                FinancialBucket(source, kind, amount, count)
            }
            FinancialCurrency(code, buckets)
        }
        require(currencies.map { it.currency }.distinct().size == currencies.size)

        return ValidatedMacroAnalyticsPublication(
            ProtocolVersion(protocolVersion),
            ContributorId(contributorId),
            AnalyticsPeriod(period),
            PublicationRevision(revision),
            MacroAnalyticsContribution(SchemaVersion(schemaVersion), ContributionDimensions(country, region, sex, ageBand), FinancialContribution(currencies)),
        )
    }

    private fun JSONObject.requireKeys(vararg keys: String) {
        require(keySet() == keys.toSet()) { "Unexpected or missing fields" }
    }

    private fun JSONObject.requiredObject(key: String) = get(key) as? JSONObject ?: error("$key must be an object")

    private fun JSONObject.requiredArray(key: String) = get(key) as? JSONArray ?: error("$key must be an array")

    private fun JSONObject.requiredString(key: String) = get(key) as? String ?: error("$key must be a string")

    private fun JSONObject.requiredInt(key: String): Int {
        val number = get(key) as? Number ?: error("$key must be an integer")
        val value = number.toLong()
        require(value in Int.MIN_VALUE..Int.MAX_VALUE && number.toDouble() == value.toDouble())
        return value.toInt()
    }

    private fun JSONArray.mapCurrencies(transform: (Any) -> FinancialCurrency): List<FinancialCurrency> = (0 until length()).map { transform(get(it)) }

    private fun JSONArray.mapBuckets(transform: (Any) -> FinancialBucket): List<FinancialBucket> = (0 until length()).map { transform(get(it)) }

    private companion object {
        val PERIOD = Regex("^(?!0000-)[0-9]{4}-(0[1-9]|1[0-2])$")
        val COUNTRY = Regex("^[A-Z]{2}$")
        val CURRENCY = Regex("^[A-Z]{3}$")
        val AMOUNT = Regex("^(0|[1-9][0-9]*)(\\.[0-9]+)?$")
        val SEXES = setOf("FEMALE", "MALE", "INTERSEX", "NOT_DISCLOSED")
        val AGE_BANDS = setOf("0_17", "18_24", "25_34", "35_44", "45_54", "55_64", "65_PLUS")
        val SOURCES = setOf("POSTED", "EXPECTED", "SCHEDULED")
        val KINDS = setOf("INCOME", "EXPENSE", "TRANSFER_IN", "TRANSFER_OUT")
    }
}
