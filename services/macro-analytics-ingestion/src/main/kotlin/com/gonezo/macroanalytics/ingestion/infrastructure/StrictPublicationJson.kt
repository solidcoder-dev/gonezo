package com.gonezo.macroanalytics.ingestion.infrastructure

import com.gonezo.macroanalytics.ingestion.domain.ContributionDimensions
import com.gonezo.macroanalytics.ingestion.domain.CategoryBucket
import com.gonezo.macroanalytics.ingestion.domain.CategoryContribution
import com.gonezo.macroanalytics.ingestion.domain.CategoryCurrency
import com.gonezo.macroanalytics.ingestion.domain.FinancialBucket
import com.gonezo.macroanalytics.ingestion.domain.FinancialContribution
import com.gonezo.macroanalytics.ingestion.domain.FinancialCurrency
import org.json.JSONArray
import org.json.JSONObject
import java.math.BigDecimal

internal fun JSONObject.requireKeys(vararg keys: String) {
    require(keySet() == keys.toSet()) { "Unexpected or missing fields" }
}

internal fun JSONObject.requiredObject(key: String): JSONObject = get(key) as? JSONObject ?: error("$key must be an object")

internal fun JSONObject.requiredArray(key: String): JSONArray = get(key) as? JSONArray ?: error("$key must be an array")

internal fun JSONObject.requiredString(key: String): String = get(key) as? String ?: error("$key must be a string")

internal fun JSONObject.requiredInt(key: String): Int {
    val number = get(key) as? Number ?: error("$key must be an integer")
    val value = number.toLong()
    require(value in Int.MIN_VALUE..Int.MAX_VALUE && number.toDouble() == value.toDouble())
    return value.toInt()
}

internal fun JSONObject.parseContributionDimensions(): ContributionDimensions {
    val dimensions = requiredObject("dimensions").also {
        it.requireKeys("countryCode", "regionCode", "sex", "ageBand")
    }
    val country = dimensions.requiredString("countryCode").also { require(Regex("^[A-Z]{2}$").matches(it)) }
    val region = dimensions.requiredString("regionCode").also { require(it.isNotBlank()) }
    val sex = dimensions.requiredString("sex").also { require(it in setOf("FEMALE", "MALE", "INTERSEX", "NOT_DISCLOSED")) }
    val ageBand = dimensions.requiredString("ageBand").also { require(it in setOf("0_17", "18_24", "25_34", "35_44", "45_54", "55_64", "65_PLUS")) }
    return ContributionDimensions(country, region, sex, ageBand)
}

internal fun JSONObject.parseFinancialContribution(): FinancialContribution {
    val financial = requiredObject("financial").also { it.requireKeys("currencies") }
    val currencies = financial.requiredArray("currencies").map { item ->
        val currency = item as? JSONObject ?: error("Currency must be an object")
        currency.requireKeys("currency", "buckets")
        val code = currency.requiredString("currency").also { require(Regex("^[A-Z]{3}$").matches(it)) }
        val buckets = currency.requiredArray("buckets").map { bucketItem ->
            val bucket = bucketItem as? JSONObject ?: error("Financial bucket must be an object")
            bucket.requireKeys("source", "kind", "amount", "count")
            val source = bucket.requiredString("source").also { require(it in setOf("POSTED", "EXPECTED", "SCHEDULED")) }
            val kind = bucket.requiredString("kind").also { require(it in setOf("INCOME", "EXPENSE", "TRANSFER_IN", "TRANSFER_OUT")) }
            val amount = bucket.requiredString("amount").also { require(Regex("^(0|[1-9][0-9]*)(\\.[0-9]+)?$").matches(it)) }
            val count = bucket.requiredInt("count").also { require(it >= 1) }
            FinancialBucket(source, kind, amount, count)
        }
        FinancialCurrency(code, buckets)
    }
    require(currencies.map { it.currency }.distinct().size == currencies.size)
    return FinancialContribution(currencies)
}

internal fun JSONObject.parseCategoryContribution(): CategoryContribution {
    val categoryObject = requiredObject("categories").also { it.requireKeys("currencies") }
    val currencies = categoryObject.requiredArray("currencies").map { item ->
        val currency = item as? JSONObject ?: error("Category currency must be an object")
        currency.requireKeys("currency", "buckets")
        val code = currency.requiredString("currency").also { require(Regex("^[A-Z]{3}$").matches(it)) }
        val buckets = currency.requiredArray("buckets").map { bucketItem ->
            val bucket = bucketItem as? JSONObject ?: error("Category bucket must be an object")
            bucket.requireKeys("source", "kind", "category", "amount")
            val source = bucket.requiredString("source").also { require(it in setOf("POSTED", "EXPECTED", "SCHEDULED")) }
            val kind = bucket.requiredString("kind").also { require(it in setOf("INCOME", "EXPENSE")) }
            val category = bucket.requiredString("category").also { require(it in setOf("BILLS", "GROCERIES", "DINING", "TRANSPORT", "HEALTH", "SHOPPING", "ENTERTAINMENT", "TRAVEL", "OTHER_EXPENSE", "BEAUTY", "SERVICES", "WORK_INCOME", "INVESTMENTS", "REIMBURSEMENTS", "GIFTS_BENEFITS", "OTHER_INCOME", "UNMAPPED_EXPENSE", "UNMAPPED_INCOME")) }
            val amount = bucket.requiredString("amount").also {
                require(Regex("^(?:0|[1-9][0-9]*)(?:\\.[0-9]*[1-9])?$|^(?:[1-9][0-9]*)(?:\\.[0-9]+)?$").matches(it))
                require(BigDecimal(it).compareTo(BigDecimal.ZERO) > 0)
                require(BigDecimal(it).stripTrailingZeros().toPlainString() == it)
            }
            CategoryBucket(source, kind, category, amount)
        }
        require(buckets.map { listOf(it.source, it.kind, it.category) }.distinct().size == buckets.size)
        CategoryCurrency(code, buckets)
    }
    require(currencies.map { it.currency }.distinct().size == currencies.size)
    return CategoryContribution(currencies)
}
