package com.gonezo.macroanalytics.ingestion.application

import com.gonezo.macroanalytics.ingestion.domain.ValidatedMacroAnalyticsPublication

interface MacroAnalyticsPublicationPayloadParser {
    fun parse(json: String): ValidatedMacroAnalyticsPublication
}
