package com.gonezo.macroanalytics.ingestion.infrastructure

import com.gonezo.macroanalytics.ingestion.application.MacroAnalyticsPublicationPayloadParser
import com.gonezo.macroanalytics.ingestion.domain.AnalyticsPeriod
import com.gonezo.macroanalytics.ingestion.domain.ContributorId
import com.gonezo.macroanalytics.ingestion.domain.MacroAnalyticsContribution
import com.gonezo.macroanalytics.ingestion.domain.ProtocolVersion
import com.gonezo.macroanalytics.ingestion.domain.PublicationRevision
import com.gonezo.macroanalytics.ingestion.domain.SchemaVersion
import com.gonezo.macroanalytics.ingestion.domain.ValidatedMacroAnalyticsPublication
import org.json.JSONObject

class UnsupportedProtocolVersion(val version: Int) : IllegalArgumentException("Unsupported protocol version: $version")

class UnsupportedSchemaVersion(val version: Int) : IllegalArgumentException("Unsupported contribution schema version: $version")

class MacroAnalyticsPublicationWireV1Parser : MacroAnalyticsPublicationPayloadParser {
    override fun parse(json: String): ValidatedMacroAnalyticsPublication {
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

        val dimensions = contribution.parseContributionDimensions()
        val financial = contribution.parseFinancialContribution()

        return ValidatedMacroAnalyticsPublication(
            ProtocolVersion(protocolVersion),
            ContributorId(contributorId),
            AnalyticsPeriod(period),
            PublicationRevision(revision),
            MacroAnalyticsContribution(SchemaVersion(schemaVersion), dimensions, financial),
        )
    }

    private companion object {
        val PERIOD = Regex("^(?!0000-)[0-9]{4}-(0[1-9]|1[0-2])$")
    }
}
