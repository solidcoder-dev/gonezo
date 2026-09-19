package com.gonezo.macroanalytics.ingestion.application

import com.gonezo.macroanalytics.ingestion.domain.ContributorId
import com.gonezo.macroanalytics.ingestion.security.ContributorCredential
import com.gonezo.macroanalytics.ingestion.security.ContributorCredentialRegistrationOutcome
import com.gonezo.macroanalytics.ingestion.security.ContributorCredentialRegistrationV1
import com.gonezo.macroanalytics.ingestion.security.ECDSA_P256_SHA256
import java.nio.charset.StandardCharsets
import java.util.Base64

class RegisterContributorCredential(private val repository: ContributorCredentialRepository, private val signatureVerifier: PublicationSignatureVerifier) {
    fun execute(registration: ContributorCredentialRegistrationV1): ContributorCredentialRegistrationOutcome {
        if (registration.algorithm != ECDSA_P256_SHA256 || registration.contributorId.isBlank()) {
            return ContributorCredentialRegistrationOutcome.INVALID_PROOF
        }
        val expectedKeyId = signatureVerifier.keyId(registration.publicKey)
        if (registration.keyId != expectedKeyId || !signatureVerifier.verify(registration.publicKey, proofBytes(registration), registration.proof)) {
            return ContributorCredentialRegistrationOutcome.INVALID_PROOF
        }
        val contributorId = ContributorId(registration.contributorId)
        val existing = repository.find(contributorId)
        val credential = ContributorCredential(contributorId, expectedKeyId, registration.algorithm, Base64.getUrlEncoder().withoutPadding().encodeToString(registration.publicKey))
        if (existing != null) {
            return if (existing == credential) ContributorCredentialRegistrationOutcome.ALREADY_REGISTERED else ContributorCredentialRegistrationOutcome.CREDENTIAL_CONFLICT
        }
        repository.save(credential)
        return ContributorCredentialRegistrationOutcome.REGISTERED
    }

    private fun proofBytes(registration: ContributorCredentialRegistrationV1): ByteArray = "gonezo-macro-analytics-credential-v1\n${registration.contributorId}\n${registration.keyId}".toByteArray(StandardCharsets.UTF_8)
}
