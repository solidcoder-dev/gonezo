package com.gonezo.macroanalytics.ingestion.infrastructure

import com.gonezo.macroanalytics.ingestion.application.ContributorCredentialRepository
import com.gonezo.macroanalytics.ingestion.domain.ContributorId
import com.gonezo.macroanalytics.ingestion.security.ContributorCredential

class InMemoryContributorCredentialRepository : ContributorCredentialRepository {
    private val credentials = mutableMapOf<ContributorId, ContributorCredential>()

    override fun find(contributorId: ContributorId): ContributorCredential? = credentials[contributorId]

    override fun save(credential: ContributorCredential) {
        credentials[credential.contributorId] = credential
    }
}
