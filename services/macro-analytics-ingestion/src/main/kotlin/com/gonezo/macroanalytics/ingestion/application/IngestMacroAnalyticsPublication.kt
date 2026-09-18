package com.gonezo.macroanalytics.ingestion.application

import com.gonezo.macroanalytics.ingestion.domain.PublicationIngestionOutcome
import com.gonezo.macroanalytics.ingestion.domain.PublicationIngestionResult
import com.gonezo.macroanalytics.ingestion.domain.ValidatedMacroAnalyticsPublication

class IngestMacroAnalyticsPublication(private val repository: LatestMacroAnalyticsPublicationRepository) {
    fun execute(publication: ValidatedMacroAnalyticsPublication): PublicationIngestionResult {
        val current = repository.find(publication.contributorId, publication.period)
        if (current == null) {
            repository.save(publication)
            return PublicationIngestionResult(PublicationIngestionOutcome.ACCEPTED, publication.revision)
        }

        val result = when {
            publication.revision.value > current.revision.value -> {
                repository.save(publication)
                PublicationIngestionOutcome.UPDATED
            }

            publication.revision.value < current.revision.value -> PublicationIngestionOutcome.STALE

            publication.fingerprint() == current.fingerprint() -> PublicationIngestionOutcome.ALREADY_CURRENT

            else -> PublicationIngestionOutcome.REVISION_CONFLICT
        }
        val currentRevision = if (result == PublicationIngestionOutcome.UPDATED) publication.revision else current.revision
        return PublicationIngestionResult(result, currentRevision)
    }
}
