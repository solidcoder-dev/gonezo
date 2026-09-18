package com.gonezo.macroanalytics.ingestion.infrastructure

import com.gonezo.macroanalytics.ingestion.application.LatestMacroAnalyticsPublicationRepository
import com.gonezo.macroanalytics.ingestion.domain.AnalyticsPeriod
import com.gonezo.macroanalytics.ingestion.domain.ContributorId
import com.gonezo.macroanalytics.ingestion.domain.LatestPublicationKey
import com.gonezo.macroanalytics.ingestion.domain.ValidatedMacroAnalyticsPublication

class InMemoryLatestMacroAnalyticsPublicationRepository : LatestMacroAnalyticsPublicationRepository {
    private val publications = mutableMapOf<LatestPublicationKey, ValidatedMacroAnalyticsPublication>()

    override fun find(contributorId: ContributorId, period: AnalyticsPeriod) = publications[LatestPublicationKey(contributorId, period)]

    override fun save(publication: ValidatedMacroAnalyticsPublication) {
        publications[LatestPublicationKey(publication.contributorId, publication.period)] = publication
    }
}
