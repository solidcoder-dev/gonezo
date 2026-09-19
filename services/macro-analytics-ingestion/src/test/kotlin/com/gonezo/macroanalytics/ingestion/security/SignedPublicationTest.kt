package com.gonezo.macroanalytics.ingestion.security

import com.gonezo.macroanalytics.ingestion.application.AuthenticateAndIngestMacroAnalyticsPublication
import com.gonezo.macroanalytics.ingestion.application.IngestMacroAnalyticsPublication
import com.gonezo.macroanalytics.ingestion.infrastructure.InMemoryContributorCredentialRepository
import com.gonezo.macroanalytics.ingestion.infrastructure.InMemoryLatestMacroAnalyticsPublicationRepository
import com.gonezo.macroanalytics.ingestion.infrastructure.JcaPublicationSignatureVerifier
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV1Parser
import java.io.File
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals

class SignedPublicationTest {
    @Test
    fun `authenticates exact publication bytes before ingestion`() {
        val keys = keyPair()
        val verifier = JcaPublicationSignatureVerifier()
        val credentialRepository = InMemoryContributorCredentialRepository()
        val contributorId = "opaque-random-id"
        val keyId = verifier.keyId(keys.public.encoded)
        credentialRepository.save(ContributorCredential(com.gonezo.macroanalytics.ingestion.domain.ContributorId(contributorId), keyId, ECDSA_P256_SHA256, Base64.getUrlEncoder().withoutPadding().encodeToString(keys.public.encoded)))
        val publicationRepository = InMemoryLatestMacroAnalyticsPublicationRepository()
        val fixture = File("../../contracts/macro-analytics/fixtures/publication-v1-valid.json").readText()
        val signed = signedPublication(contributorId, keyId, fixture, keys)
        val parser = MacroAnalyticsPublicationWireV1Parser()
        val authenticateAndIngest = AuthenticateAndIngestMacroAnalyticsPublication(credentialRepository, verifier, parser, IngestMacroAnalyticsPublication(publicationRepository))

        val result = authenticateAndIngest.execute(signed)

        assertEquals(PublicationAuthenticationResult.AUTHENTICATED, result.authentication)
        assertEquals("ACCEPTED", result.ingestion?.outcome?.name)
        val tampered = signed.copy(payload = fixture.replace("12.00", "1200.00"))
        val rejected = authenticateAndIngest.execute(tampered)
        assertEquals(PublicationAuthenticationResult.INVALID_SIGNATURE, rejected.authentication)
        assertEquals(parser.parse(fixture), publicationRepository.find(com.gonezo.macroanalytics.ingestion.domain.ContributorId(contributorId), parser.parse(fixture).period))
    }

    private fun signedPublication(contributorId: String, keyId: String, payload: String, keys: KeyPair): SignedMacroAnalyticsPublication {
        val signer = Signature.getInstance("SHA256withECDSA").apply {
            initSign(keys.private)
            update(payload.toByteArray(Charsets.UTF_8))
        }
        return SignedMacroAnalyticsPublication(contributorId, keyId, ECDSA_P256_SHA256, payload, Base64.getUrlEncoder().withoutPadding().encodeToString(signer.sign()))
    }

    private fun keyPair() = KeyPairGenerator.getInstance("EC").apply { initialize(ECGenParameterSpec("secp256r1")) }.generateKeyPair()
}
