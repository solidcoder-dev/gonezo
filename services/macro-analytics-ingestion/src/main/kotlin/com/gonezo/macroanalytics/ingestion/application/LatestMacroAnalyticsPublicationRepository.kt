package com.gonezo.macroanalytics.ingestion.application

import com.gonezo.macroanalytics.ingestion.domain.AnalyticsPeriod
import com.gonezo.macroanalytics.ingestion.domain.ContributorId
import com.gonezo.macroanalytics.ingestion.domain.LatestPublicationKey
import com.gonezo.macroanalytics.ingestion.domain.ValidatedMacroAnalyticsPublication

interface LatestMacroAnalyticsPublicationRepository {
    fun find(contributorId: ContributorId, period: AnalyticsPeriod): ValidatedMacroAnalyticsPublication?

    fun save(publication: ValidatedMacroAnalyticsPublication)
}

fun ValidatedMacroAnalyticsPublication.key() = LatestPublicationKey(contributorId, period)
