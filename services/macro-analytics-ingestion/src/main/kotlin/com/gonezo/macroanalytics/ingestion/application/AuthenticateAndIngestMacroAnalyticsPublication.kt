package com.gonezo.macroanalytics.ingestion.application

import com.gonezo.macroanalytics.ingestion.domain.PublicationIngestionResult
import com.gonezo.macroanalytics.ingestion.security.ECDSA_P256_SHA256
import com.gonezo.macroanalytics.ingestion.security.PublicationAuthenticationResult
import com.gonezo.macroanalytics.ingestion.security.SignedMacroAnalyticsPublication
import java.nio.charset.StandardCharsets
import java.util.Base64

class AuthenticateAndIngestMacroAnalyticsPublication(private val credentials: ContributorCredentialRepository, private val signatureVerifier: PublicationSignatureVerifier, private val parser: MacroAnalyticsPublicationPayloadParser, private val ingest: IngestMacroAnalyticsPublication) {
    fun execute(signed: SignedMacroAnalyticsPublication): AuthenticatedPublicationIngestion {
        val credential = credentials.find(com.gonezo.macroanalytics.ingestion.domain.ContributorId(signed.contributorId))
            ?: return rejected(PublicationAuthenticationResult.UNKNOWN_CREDENTIAL)
        if (signed.algorithm != credential.algorithm || signed.algorithm != ECDSA_P256_SHA256 || signed.keyId != credential.keyId) {
            return rejected(PublicationAuthenticationResult.CREDENTIAL_MISMATCH)
        }
        val publicKey = decode(credential.publicKey) ?: return rejected(PublicationAuthenticationResult.CREDENTIAL_MISMATCH)
        val signature = decode(signed.signature) ?: return rejected(PublicationAuthenticationResult.INVALID_SIGNATURE)
        if (!signatureVerifier.verify(publicKey, signed.payload.toByteArray(StandardCharsets.UTF_8), signature)) {
            return rejected(PublicationAuthenticationResult.INVALID_SIGNATURE)
        }
        val publication = runCatching { parser.parse(signed.payload) }.getOrNull()
            ?: return rejected(PublicationAuthenticationResult.INVALID_PUBLICATION)
        if (publication.contributorId.value != signed.contributorId) {
            return rejected(PublicationAuthenticationResult.CONTRIBUTOR_MISMATCH)
        }
        return AuthenticatedPublicationIngestion(PublicationAuthenticationResult.AUTHENTICATED, ingest.execute(publication))
    }

    private fun decode(value: String): ByteArray? = runCatching { Base64.getUrlDecoder().decode(value) }.getOrNull()

    private fun rejected(result: PublicationAuthenticationResult) = AuthenticatedPublicationIngestion(result, null)
}

data class AuthenticatedPublicationIngestion(val authentication: PublicationAuthenticationResult, val ingestion: PublicationIngestionResult?)
