package com.gonezo.macroanalytics.ingestion.infrastructure

import com.gonezo.macroanalytics.ingestion.application.MacroAnalyticsPublicationPayloadParser
import com.gonezo.macroanalytics.ingestion.domain.AnalyticsPeriod
import com.gonezo.macroanalytics.ingestion.domain.BalanceBucket
import com.gonezo.macroanalytics.ingestion.domain.BalanceContribution
import com.gonezo.macroanalytics.ingestion.domain.BalanceCurrency
import com.gonezo.macroanalytics.ingestion.domain.CategoryBucket
import com.gonezo.macroanalytics.ingestion.domain.CategoryContribution
import com.gonezo.macroanalytics.ingestion.domain.CategoryCurrency
import com.gonezo.macroanalytics.ingestion.domain.ContributionDimensions
import com.gonezo.macroanalytics.ingestion.domain.ContributorId
import com.gonezo.macroanalytics.ingestion.domain.FinancialBucket
import com.gonezo.macroanalytics.ingestion.domain.FinancialContribution
import com.gonezo.macroanalytics.ingestion.domain.FinancialCurrency
import com.gonezo.macroanalytics.ingestion.domain.MacroAnalyticsContribution
import com.gonezo.macroanalytics.ingestion.domain.MerchantBucket
import com.gonezo.macroanalytics.ingestion.domain.MerchantContribution
import com.gonezo.macroanalytics.ingestion.domain.MerchantCurrency
import com.gonezo.macroanalytics.ingestion.domain.ProtocolVersion
import com.gonezo.macroanalytics.ingestion.domain.PublicationRevision
import com.gonezo.macroanalytics.ingestion.domain.RecurringBucket
import com.gonezo.macroanalytics.ingestion.domain.RecurringContribution
import com.gonezo.macroanalytics.ingestion.domain.RecurringCurrency
import com.gonezo.macroanalytics.ingestion.domain.SchemaVersion
import com.gonezo.macroanalytics.ingestion.domain.SharingBucket
import com.gonezo.macroanalytics.ingestion.domain.SharingContribution
import com.gonezo.macroanalytics.ingestion.domain.SharingCurrency
import com.gonezo.macroanalytics.ingestion.domain.ValidatedMacroAnalyticsPublication
import org.json.JSONArray
import org.json.JSONObject
import java.math.BigDecimal

class MacroAnalyticsPublicationWireV6Parser : MacroAnalyticsPublicationPayloadParser {
    override fun parse(json: String): ValidatedMacroAnalyticsPublication {
        val root = JSONObject(json).also { it.requireKeys("protocolVersion", "contributorId", "period", "revision", "contribution") }
        require(root.requiredInt("protocolVersion") == 6) { "Protocol and schema versions must both be 6" }
        val contributorId = root.requiredString("contributorId").also { require(it.isNotBlank()) }
        val period = root.requiredString("period").also { require(PERIOD.matches(it)) }
        val revision = root.requiredInt("revision").also { require(it >= 1) }
        val contribution = root.requiredObject("contribution").also { it.requireKeys("schemaVersion", "dimensions", "financial", "categories", "recurring", "sharing", "merchants", "balances") }
        require(contribution.requiredInt("schemaVersion") == 6) { "Protocol and schema versions must both be 6" }

        val dimensions = contribution.parseContributionDimensions()
        val financial = contribution.parseFinancialContribution()
        val categories = contribution.parseCategoryContribution()
        val recurring = contribution.parseRecurringContribution()
        val sharing = contribution.parseSharingContribution()
        val merchants = contribution.parseMerchantContribution(financial.currencies)
        val balances = contribution.parseAccountBalanceContribution()
        return ValidatedMacroAnalyticsPublication(
            ProtocolVersion(6),
            ContributorId(contributorId),
            AnalyticsPeriod(period),
            PublicationRevision(revision),
            MacroAnalyticsContribution(SchemaVersion(6), dimensions, financial, categories, recurring, sharing, merchants, balances),
        )
    }

    private fun merchantCodes(catalogVersion: Int): Set<String> = when (catalogVersion) {
        1 -> setOf("MERCADONA", "LIDL", "CARREFOUR", "UNMAPPED")
        else -> error("Unsupported merchant catalog version")
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
        val ACCOUNT_TYPES = setOf("BANK", "CASH", "CARD", "WALLET", "SAVINGS", "OTHER")
        val BALANCE_AMOUNT = Regex("^-?(0|[1-9][0-9]*)(\\.[0-9]+)?$")
        val CATEGORIES = setOf("BILLS", "GROCERIES", "DINING", "TRANSPORT", "HEALTH", "SHOPPING", "ENTERTAINMENT", "TRAVEL", "OTHER_EXPENSE", "BEAUTY", "SERVICES", "WORK_INCOME", "INVESTMENTS", "REIMBURSEMENTS", "GIFTS_BENEFITS", "OTHER_INCOME", "UNMAPPED_EXPENSE", "UNMAPPED_INCOME")
    }
}
