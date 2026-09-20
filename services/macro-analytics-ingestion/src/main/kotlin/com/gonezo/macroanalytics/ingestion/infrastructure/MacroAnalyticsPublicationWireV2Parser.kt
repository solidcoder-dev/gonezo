package com.gonezo.macroanalytics.ingestion.infrastructure

import com.gonezo.macroanalytics.ingestion.application.MacroAnalyticsPublicationPayloadParser
import com.gonezo.macroanalytics.ingestion.domain.AnalyticsPeriod
import com.gonezo.macroanalytics.ingestion.domain.CategoryBucket
import com.gonezo.macroanalytics.ingestion.domain.CategoryContribution
import com.gonezo.macroanalytics.ingestion.domain.CategoryCurrency
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
import java.math.BigDecimal

class MacroAnalyticsPublicationWireV2Parser : MacroAnalyticsPublicationPayloadParser {
    override fun parse(json: String): ValidatedMacroAnalyticsPublication {
        val root = JSONObject(json).also { it.requireKeys("protocolVersion", "contributorId", "period", "revision", "contribution") }
        require(root.requiredInt("protocolVersion") == 2) { "Protocol and schema versions must both be 2" }
        val contributorId = root.requiredString("contributorId").also { require(it.isNotBlank()) }
        val period = root.requiredString("period").also { require(PERIOD.matches(it)) }
        val revision = root.requiredInt("revision").also { require(it >= 1) }
        val contribution = root.requiredObject("contribution").also { it.requireKeys("schemaVersion", "dimensions", "financial", "categories") }
        require(contribution.requiredInt("schemaVersion") == 2) { "Protocol and schema versions must both be 2" }

        val dimensions = contribution.requiredObject("dimensions").also { it.requireKeys("countryCode", "regionCode", "sex", "ageBand") }
        val country = dimensions.requiredString("countryCode").also { require(COUNTRY.matches(it)) }
        val region = dimensions.requiredString("regionCode").also { require(it.isNotBlank()) }
        val sex = dimensions.requiredString("sex").also { require(it in SEXES) }
        val ageBand = dimensions.requiredString("ageBand").also { require(it in AGE_BANDS) }
        val financial = contribution.requiredObject("financial").also { it.requireKeys("currencies") }
        val financialCurrencies = financial.requiredArray("currencies").map { item ->
            val currency = item as? JSONObject ?: error("Currency must be an object")
            currency.requireKeys("currency", "buckets")
            val code = currency.requiredString("currency").also { require(CURRENCY.matches(it)) }
            val buckets = currency.requiredArray("buckets").map { bucketItem ->
                val bucket = bucketItem as? JSONObject ?: error("Financial bucket must be an object")
                bucket.requireKeys("source", "kind", "amount", "count")
                val source = bucket.requiredString("source").also { require(it in SOURCES) }
                val kind = bucket.requiredString("kind").also { require(it in FINANCIAL_KINDS) }
                val amount = bucket.requiredString("amount").also { require(AMOUNT.matches(it)) }
                val count = bucket.requiredInt("count").also { require(it >= 1) }
                FinancialBucket(source, kind, amount, count)
            }
            FinancialCurrency(code, buckets)
        }
        require(financialCurrencies.map { it.currency }.distinct().size == financialCurrencies.size)

        val categoryObject = contribution.requiredObject("categories").also { it.requireKeys("currencies") }
        val categoryCurrencies = categoryObject.requiredArray("currencies").map { item ->
            val currency = item as? JSONObject ?: error("Category currency must be an object")
            currency.requireKeys("currency", "buckets")
            val code = currency.requiredString("currency").also { require(CURRENCY.matches(it)) }
            val buckets = currency.requiredArray("buckets").map { bucketItem ->
                val bucket = bucketItem as? JSONObject ?: error("Category bucket must be an object")
                bucket.requireKeys("source", "kind", "category", "amount")
                val source = bucket.requiredString("source").also { require(it in SOURCES) }
                val kind = bucket.requiredString("kind").also { require(it in CATEGORY_KINDS) }
                val category = bucket.requiredString("category").also { require(it in CATEGORIES) }
                val amount = bucket.requiredString("amount").also {
                    require(CANONICAL_POSITIVE_AMOUNT.matches(it))
                    require(BigDecimal(it).compareTo(BigDecimal.ZERO) > 0)
                    require(BigDecimal(it).stripTrailingZeros().toPlainString() == it)
                }
                CategoryBucket(source, kind, category, amount)
            }
            require(buckets.map { listOf(it.source, it.kind, it.category) }.distinct().size == buckets.size)
            CategoryCurrency(code, buckets)
        }
        require(categoryCurrencies.map { it.currency }.distinct().size == categoryCurrencies.size)

        return ValidatedMacroAnalyticsPublication(
            ProtocolVersion(2),
            ContributorId(contributorId),
            AnalyticsPeriod(period),
            PublicationRevision(revision),
            MacroAnalyticsContribution(SchemaVersion(2), ContributionDimensions(country, region, sex, ageBand), FinancialContribution(financialCurrencies), CategoryContribution(categoryCurrencies)),
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

    private companion object {
        val PERIOD = Regex("^(?!0000-)[0-9]{4}-(0[1-9]|1[0-2])$")
        val COUNTRY = Regex("^[A-Z]{2}$")
        val CURRENCY = Regex("^[A-Z]{3}$")
        val AMOUNT = Regex("^(0|[1-9][0-9]*)(\\.[0-9]+)?$")
        val CANONICAL_POSITIVE_AMOUNT = Regex("^(?:0|[1-9][0-9]*)(?:\\.[0-9]*[1-9])?$|^(?:[1-9][0-9]*)(?:\\.[0-9]+)?$")
        val SEXES = setOf("FEMALE", "MALE", "INTERSEX", "NOT_DISCLOSED")
        val AGE_BANDS = setOf("0_17", "18_24", "25_34", "35_44", "45_54", "55_64", "65_PLUS")
        val SOURCES = setOf("POSTED", "EXPECTED", "SCHEDULED")
        val FINANCIAL_KINDS = setOf("INCOME", "EXPENSE", "TRANSFER_IN", "TRANSFER_OUT")
        val CATEGORY_KINDS = setOf("INCOME", "EXPENSE")
        val CATEGORIES = setOf("BILLS", "GROCERIES", "DINING", "TRANSPORT", "HEALTH", "SHOPPING", "ENTERTAINMENT", "TRAVEL", "OTHER_EXPENSE", "BEAUTY", "SERVICES", "WORK_INCOME", "INVESTMENTS", "REIMBURSEMENTS", "GIFTS_BENEFITS", "OTHER_INCOME", "UNMAPPED_EXPENSE", "UNMAPPED_INCOME")
    }
}
