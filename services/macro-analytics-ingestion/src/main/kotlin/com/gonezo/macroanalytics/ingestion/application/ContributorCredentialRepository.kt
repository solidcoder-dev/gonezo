package com.gonezo.macroanalytics.ingestion.application

import com.gonezo.macroanalytics.ingestion.domain.ContributorId
import com.gonezo.macroanalytics.ingestion.security.ContributorCredential

interface ContributorCredentialRepository {
    fun find(contributorId: ContributorId): ContributorCredential?
    fun save(credential: ContributorCredential)
}
