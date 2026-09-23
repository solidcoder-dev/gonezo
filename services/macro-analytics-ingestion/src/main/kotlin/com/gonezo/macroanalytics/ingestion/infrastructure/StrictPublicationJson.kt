package com.gonezo.macroanalytics.ingestion.infrastructure

import com.gonezo.macroanalytics.ingestion.domain.BalanceBucket
import com.gonezo.macroanalytics.ingestion.domain.BalanceContribution
import com.gonezo.macroanalytics.ingestion.domain.BalanceCurrency
import com.gonezo.macroanalytics.ingestion.domain.CategoryBucket
import com.gonezo.macroanalytics.ingestion.domain.CategoryContribution
import com.gonezo.macroanalytics.ingestion.domain.CategoryCurrency
import com.gonezo.macroanalytics.ingestion.domain.ContributionDimensions
import com.gonezo.macroanalytics.ingestion.domain.FinancialBucket
import com.gonezo.macroanalytics.ingestion.domain.FinancialContribution
import com.gonezo.macroanalytics.ingestion.domain.FinancialCurrency
import com.gonezo.macroanalytics.ingestion.domain.MerchantBucket
import com.gonezo.macroanalytics.ingestion.domain.MerchantContribution
import com.gonezo.macroanalytics.ingestion.domain.MerchantCurrency
import com.gonezo.macroanalytics.ingestion.domain.RecurringBucket
import com.gonezo.macroanalytics.ingestion.domain.RecurringContribution
import com.gonezo.macroanalytics.ingestion.domain.RecurringCurrency
import com.gonezo.macroanalytics.ingestion.domain.SharingBucket
import com.gonezo.macroanalytics.ingestion.domain.SharingContribution
import com.gonezo.macroanalytics.ingestion.domain.SharingCurrency
import com.gonezo.macroanalytics.ingestion.domain.TagUsageBucket
import com.gonezo.macroanalytics.ingestion.domain.TagUsageContribution
import com.gonezo.macroanalytics.ingestion.domain.TagUsageCurrency
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

private val CURRENCY = Regex("^[A-Z]{3}$")
private val AMOUNT = Regex("^(0|[1-9][0-9]*)(\\.[0-9]+)?$")
private val SOURCES = setOf("POSTED", "EXPECTED", "SCHEDULED")
private val CATEGORY_KINDS = setOf("INCOME", "EXPENSE")
private val ACCOUNT_TYPES = setOf("BANK", "CASH", "CARD", "WALLET", "SAVINGS", "OTHER")
private val BALANCE_AMOUNT = Regex("^-?(0|[1-9][0-9]*)(\\.[0-9]+)?$")

internal fun JSONObject.parseRecurringContribution(): RecurringContribution {
    val recurringObject = requiredObject("recurring").also { it.requireKeys("currencies") }
    val recurringCurrencies = recurringObject.requiredArray("currencies").map { item ->
        val currency = item as? JSONObject ?: error("Recurring currency must be an object")
        currency.requireKeys("currency", "buckets")
        val code = currency.requiredString("currency").also { require(CURRENCY.matches(it)) }
        val buckets = currency.requiredArray("buckets").map { bucketItem ->
            val bucket = bucketItem as? JSONObject ?: error("Recurring bucket must be an object")
            bucket.requireKeys("source", "kind", "amount", "occurrenceCount", "seriesCount")
            val source = bucket.requiredString("source").also { require(it in SOURCES) }
            val kind = bucket.requiredString("kind").also { require(it in CATEGORY_KINDS) }
            val amount = bucket.requiredString("amount").also { require(AMOUNT.matches(it) && BigDecimal(it).compareTo(BigDecimal.ZERO) >= 0) }
            val occurrenceCount = bucket.requiredInt("occurrenceCount").also { require(it >= 1) }
            val seriesCount = bucket.requiredInt("seriesCount").also { require(it >= 1 && it <= occurrenceCount) }
            RecurringBucket(source, kind, amount, occurrenceCount, seriesCount)
        }
        require(buckets.map { listOf(it.source, it.kind) }.distinct().size == buckets.size)
        RecurringCurrency(code, buckets)
    }
    require(recurringCurrencies.map { it.currency }.distinct().size == recurringCurrencies.size)
    return RecurringContribution(recurringCurrencies)
}

internal fun JSONObject.parseSharingContribution(): SharingContribution {
    val sharingObject = requiredObject("sharing").also { it.requireKeys("currencies") }
    val sharingCurrencies = sharingObject.requiredArray("currencies").map { item ->
        val currency = item as? JSONObject ?: error("Sharing currency must be an object")
        currency.requireKeys("currency", "buckets")
        val code = currency.requiredString("currency").also { require(CURRENCY.matches(it)) }
        val buckets = currency.requiredArray("buckets").map { bucketItem ->
            val bucket = bucketItem as? JSONObject ?: error("Sharing bucket must be an object")
            bucket.requireKeys("source", "kind", "fullAmount", "personalAmount", "participantAllocatedAmount", "settlementRequiredAmount", "movementCount", "participantCount", "settlementParticipantCount")
            val source = bucket.requiredString("source").also { require(it in SOURCES) }
            val kind = bucket.requiredString("kind").also { require(it in CATEGORY_KINDS) }
            val full = bucket.requiredString("fullAmount").also { require(AMOUNT.matches(it) && BigDecimal(it).compareTo(BigDecimal.ZERO) > 0) }
            val personal = bucket.requiredString("personalAmount").also { require(AMOUNT.matches(it) && BigDecimal(it).compareTo(BigDecimal.ZERO) >= 0) }
            val allocated = bucket.requiredString("participantAllocatedAmount").also { require(AMOUNT.matches(it) && BigDecimal(it).compareTo(BigDecimal.ZERO) >= 0) }
            val settlement = bucket.requiredString("settlementRequiredAmount").also { require(AMOUNT.matches(it) && BigDecimal(it).compareTo(BigDecimal.ZERO) >= 0) }
            val movementCount = bucket.requiredInt("movementCount").also { require(it >= 1) }
            val participantCount = bucket.requiredInt("participantCount").also { require(it >= 0) }
            val settlementParticipantCount = bucket.requiredInt("settlementParticipantCount").also { require(it >= 0 && it <= participantCount) }
            val fullDecimal = BigDecimal(full)
            val personalDecimal = BigDecimal(personal)
            val allocatedDecimal = BigDecimal(allocated)
            val settlementDecimal = BigDecimal(settlement)
            require(personalDecimal.add(settlementDecimal).compareTo(fullDecimal) == 0)
            require(settlementDecimal <= allocatedDecimal && allocatedDecimal <= fullDecimal)
            SharingBucket(source, kind, full, personal, allocated, settlement, movementCount, participantCount, settlementParticipantCount)
        }
        require(buckets.map { listOf(it.source, it.kind) }.distinct().size == buckets.size)
        SharingCurrency(code, buckets)
    }
    require(sharingCurrencies.map { it.currency }.distinct().size == sharingCurrencies.size)
    return SharingContribution(sharingCurrencies)
}

internal fun JSONObject.parseMerchantContribution(financialCurrencies: List<FinancialCurrency>): MerchantContribution {
    val merchantObject = requiredObject("merchants").also { it.requireKeys("catalogVersion", "currencies") }
    val catalogVersion = merchantObject.requiredInt("catalogVersion").also { require(it >= 1) }
    val merchantCurrencies = merchantObject.requiredArray("currencies").map { item ->
        val currency = item as? JSONObject ?: error("Merchant currency must be an object")
        currency.requireKeys("currency", "buckets")
        val code = currency.requiredString("currency").also { require(CURRENCY.matches(it)) }
        val buckets = currency.requiredArray("buckets").map { bucketItem ->
            val bucket = bucketItem as? JSONObject ?: error("Merchant bucket must be an object")
            bucket.requireKeys("source", "kind", "merchant", "amount", "movementCount")
            val source = bucket.requiredString("source").also { require(it in SOURCES) }
            val kind = bucket.requiredString("kind").also { require(it in CATEGORY_KINDS) }
            val merchant = bucket.requiredString("merchant").also { require(it in merchantCodes(catalogVersion)) }
            val amount = bucket.requiredString("amount").also { require(AMOUNT.matches(it) && BigDecimal(it).compareTo(BigDecimal.ZERO) >= 0) }
            val movementCount = bucket.requiredInt("movementCount").also { require(it >= 1) }
            MerchantBucket(source, kind, merchant, amount, movementCount)
        }
        require(buckets.map { listOf(it.source, it.kind, it.merchant) }.distinct().size == buckets.size)
        MerchantCurrency(code, buckets)
    }
    require(merchantCurrencies.map { it.currency }.distinct().size == merchantCurrencies.size)
    val merchantContribution = MerchantContribution(catalogVersion, merchantCurrencies)
    merchantCurrencies.forEach { currency ->
        currency.buckets.forEach { bucket ->
            val financialAmount = financialCurrencies.find { it.currency == currency.currency }?.buckets
                ?.find { it.source == bucket.source && it.kind == bucket.kind }?.amount ?: "0"
            require(BigDecimal(bucket.amount) <= BigDecimal(financialAmount)) { "Merchant contribution exceeds financial contribution" }
        }
    }

    return merchantContribution
}

internal fun JSONObject.parseAccountBalanceContribution(): BalanceContribution {
    val balanceObject = requiredObject("balances").also { it.requireKeys("currencies") }
    val balanceCurrencies = balanceObject.requiredArray("currencies").map { item ->
        val currency = item as? JSONObject ?: error("Balance currency must be an object")
        currency.requireKeys("currency", "buckets")
        val code = currency.requiredString("currency").also { require(CURRENCY.matches(it)) }
        val buckets = currency.requiredArray("buckets").map { bucketItem ->
            val bucket = bucketItem as? JSONObject ?: error("Balance bucket must be an object")
            bucket.requireKeys("accountType", "balanceAmount", "accountCount")
            val accountType = bucket.requiredString("accountType").also { require(it in ACCOUNT_TYPES) }
            val amount = bucket.requiredString("balanceAmount").also { require(BALANCE_AMOUNT.matches(it)) }
            val accountCount = bucket.requiredInt("accountCount").also { require(it >= 1) }
            BalanceBucket(accountType, amount, accountCount)
        }
        require(buckets.map { it.accountType }.distinct().size == buckets.size)
        BalanceCurrency(code, buckets)
    }
    require(balanceCurrencies.map { it.currency }.distinct().size == balanceCurrencies.size)
    val balanceContribution = BalanceContribution(balanceCurrencies)

    return balanceContribution
}

internal fun JSONObject.parseTagUsageContribution(financialCurrencies: List<FinancialCurrency>): TagUsageContribution {
    val tagUsageObject = requiredObject("tagUsage").also { it.requireKeys("currencies") }
    val tagUsageCurrencies = tagUsageObject.requiredArray("currencies").map { item ->
        val currency = item as? JSONObject ?: error("Tag usage currency must be an object")
        currency.requireKeys("currency", "buckets")
        val code = currency.requiredString("currency").also { require(CURRENCY.matches(it)) }
        val buckets = currency.requiredArray("buckets").map { bucketItem ->
            val bucket = bucketItem as? JSONObject ?: error("Tag usage bucket must be an object")
            bucket.requireKeys("source", "kind", "amount", "movementCount", "taggedAmount", "taggedMovementCount")
            val source = bucket.requiredString("source").also { require(it in SOURCES) }
            val kind = bucket.requiredString("kind").also { require(it in CATEGORY_KINDS) }
            val amount = bucket.requiredString("amount").also { require(AMOUNT.matches(it) && BigDecimal(it).compareTo(BigDecimal.ZERO) >= 0) }
            val movementCount = bucket.requiredInt("movementCount").also { require(it >= 1) }
            val taggedAmount = bucket.requiredString("taggedAmount").also { require(AMOUNT.matches(it) && BigDecimal(it).compareTo(BigDecimal.ZERO) >= 0 && BigDecimal(it) <= BigDecimal(amount)) }
            val taggedMovementCount = bucket.requiredInt("taggedMovementCount").also { require(it in 0..movementCount) }
            require(taggedMovementCount != 0 || BigDecimal(taggedAmount).compareTo(BigDecimal.ZERO) == 0)
            TagUsageBucket(source, kind, amount, movementCount, taggedAmount, taggedMovementCount)
        }
        require(buckets.map { listOf(it.source, it.kind) }.distinct().size == buckets.size)
        TagUsageCurrency(code, buckets)
    }
    require(tagUsageCurrencies.map { it.currency }.distinct().size == tagUsageCurrencies.size)
    val tagUsageContribution = TagUsageContribution(tagUsageCurrencies)
    tagUsageCurrencies.forEach { currency ->
        currency.buckets.forEach { bucket ->
            val financialBucket = financialCurrencies.find { it.currency == currency.currency }?.buckets?.find { it.source == bucket.source && it.kind == bucket.kind }
            val financialAmount = financialBucket?.amount ?: "0"
            require(BigDecimal(bucket.amount).compareTo(BigDecimal(financialAmount)) == 0) { "Tag usage contribution does not reconcile with financial contribution" }
            require(bucket.movementCount >= (financialBucket?.count ?: 0)) { "Tag usage movement count is below financial contribution" }
        }
    }
    financialCurrencies.forEach { currency ->
        currency.buckets.filter { it.kind in CATEGORY_KINDS && BigDecimal(it.amount) > BigDecimal.ZERO }.forEach { bucket ->
            require(tagUsageCurrencies.find { it.currency == currency.currency }?.buckets?.any { it.source == bucket.source && it.kind == bucket.kind } == true) { "Financial contribution is missing from tag usage" }
        }
    }

    return tagUsageContribution
}

private fun merchantCodes(catalogVersion: Int): Set<String> = when (catalogVersion) {
    1 -> setOf("MERCADONA", "LIDL", "CARREFOUR", "UNMAPPED")
    else -> error("Unsupported merchant catalog version")
}
