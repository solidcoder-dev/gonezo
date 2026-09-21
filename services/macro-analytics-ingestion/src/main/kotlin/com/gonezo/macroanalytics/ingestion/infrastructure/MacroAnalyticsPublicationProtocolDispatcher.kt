package com.gonezo.macroanalytics.ingestion.infrastructure

import com.gonezo.macroanalytics.ingestion.application.MacroAnalyticsPublicationPayloadParser
import com.gonezo.macroanalytics.ingestion.domain.ValidatedMacroAnalyticsPublication
import org.json.JSONObject

class MacroAnalyticsPublicationProtocolDispatcher(private val v1: MacroAnalyticsPublicationPayloadParser = MacroAnalyticsPublicationWireV1Parser(), private val v2: MacroAnalyticsPublicationPayloadParser = MacroAnalyticsPublicationWireV2Parser(), private val v3: MacroAnalyticsPublicationPayloadParser = MacroAnalyticsPublicationWireV3Parser(), private val v4: MacroAnalyticsPublicationPayloadParser = MacroAnalyticsPublicationWireV4Parser()) : MacroAnalyticsPublicationPayloadParser {
    override fun parse(json: String): ValidatedMacroAnalyticsPublication {
        val protocolVersion = (JSONObject(json).get("protocolVersion") as? Number)?.toInt()
            ?: error("protocolVersion must be an integer")
        return when (protocolVersion) {
            1 -> v1.parse(json)
            2 -> v2.parse(json)
            3 -> v3.parse(json)
            4 -> v4.parse(json)
            else -> throw UnsupportedProtocolVersion(protocolVersion)
        }
    }
}
