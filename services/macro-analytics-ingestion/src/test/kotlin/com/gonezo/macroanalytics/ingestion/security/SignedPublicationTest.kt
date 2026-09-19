package com.gonezo.macroanalytics.ingestion.security

import com.gonezo.macroanalytics.ingestion.application.AuthenticateAndIngestMacroAnalyticsPublication
import com.gonezo.macroanalytics.ingestion.application.IngestMacroAnalyticsPublication
import com.gonezo.macroanalytics.ingestion.domain.ContributorId
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
        val environment = environment()
        val payload = fixture()
        val signed = sign("opaque-random-id", environment.keyId, payload, environment.keyPair)

        val result = environment.authenticateAndIngest.execute(signed)
        val fieldMutations = listOf(
            "2026-09" to "2026-10",
            "\"revision\":3" to "\"revision\":4",
            "\"countryCode\":\"ES\"" to "\"countryCode\":\"PT\"",
            "ES-CN" to "ES-MD",
            "FEMALE" to "MALE",
            "25_34" to "35_44",
            "\"currency\":\"EUR\"" to "\"currency\":\"USD\"",
            "12.00" to "1200.00",
            "\"count\":1" to "\"count\":2",
            "POSTED" to "EXPECTED",
            "EXPENSE" to "INCOME",
        )
        val tamperedResults = fieldMutations.map { (original, replacement) ->
            environment.authenticateAndIngest.execute(signed.copy(payload = payload.replace(original, replacement)))
        }

        assertEquals(PublicationAuthenticationResult.AUTHENTICATED, result.authentication)
        assertEquals("ACCEPTED", result.ingestion?.outcome?.name)
        assertEquals(List(fieldMutations.size) { PublicationAuthenticationResult.INVALID_SIGNATURE }, tamperedResults.map { it.authentication })
        assertEquals(environment.parser.parse(payload), environment.publications.find(ContributorId("opaque-random-id"), environment.parser.parse(payload).period))
    }

    @Test
    fun `rejects unknown contributors and wrong signing keys without ingestion`() {
        val environment = environment(registerCredential = false)
        val unknown = sign("opaque-random-id", environment.keyId, fixture(), environment.keyPair)
        val wrongKey = sign("opaque-random-id", environment.keyId, fixture(), keyPair())

        assertEquals(PublicationAuthenticationResult.UNKNOWN_CREDENTIAL, environment.authenticateAndIngest.execute(unknown).authentication)
        environment.registerCredential()
        assertEquals(PublicationAuthenticationResult.INVALID_SIGNATURE, environment.authenticateAndIngest.execute(wrongKey).authentication)
        assertEquals(null, environment.publications.find(ContributorId("opaque-random-id"), environment.parser.parse(fixture()).period))
    }

    @Test
    fun `rejects a payload whose contributor differs from its signed wrapper`() {
        val environment = environment()
        val signed = sign("opaque-random-id", environment.keyId, fixture().replace("opaque-random-id", "contributor-b"), environment.keyPair)

        val result = environment.authenticateAndIngest.execute(signed)

        assertEquals(PublicationAuthenticationResult.CONTRIBUTOR_MISMATCH, result.authentication)
        assertEquals(null, environment.publications.find(ContributorId("contributor-b"), environment.parser.parse(fixture()).period))
    }

    @Test
    fun `allows exact signed replay and sends stale signed revisions to ingestion`() {
        val environment = environment()
        val payload = fixture()
        val first = sign("opaque-random-id", environment.keyId, payload, environment.keyPair)
        environment.authenticateAndIngest.execute(first)

        val replay = environment.authenticateAndIngest.execute(first)
        val newer = sign("opaque-random-id", environment.keyId, payload.replace("\"revision\":3", "\"revision\":4"), environment.keyPair)
        environment.authenticateAndIngest.execute(newer)
        val stale = environment.authenticateAndIngest.execute(first)

        assertEquals("ALREADY_CURRENT", replay.ingestion?.outcome?.name)
        assertEquals(PublicationAuthenticationResult.AUTHENTICATED, stale.authentication)
        assertEquals("STALE", stale.ingestion?.outcome?.name)
    }

    private fun environment(registerCredential: Boolean = true): TestEnvironment {
        val keys = keyPair()
        val verifier = JcaPublicationSignatureVerifier()
        val contributorId = "opaque-random-id"
        val keyId = verifier.keyId(keys.public.encoded)
        val credentialRepository = InMemoryContributorCredentialRepository()
        val publications = InMemoryLatestMacroAnalyticsPublicationRepository()
        val parser = MacroAnalyticsPublicationWireV1Parser()
        val useCase = AuthenticateAndIngestMacroAnalyticsPublication(credentialRepository, verifier, parser, IngestMacroAnalyticsPublication(publications))
        val environment = TestEnvironment(keys, keyId, credentialRepository, publications, parser, useCase)
        if (registerCredential) environment.registerCredential()
        return environment
    }

    private fun sign(contributorId: String, keyId: String, payload: String, keys: KeyPair): SignedMacroAnalyticsPublication {
        val signer = Signature.getInstance("SHA256withECDSA").apply {
            initSign(keys.private)
            update(payload.toByteArray(Charsets.UTF_8))
        }
        return SignedMacroAnalyticsPublication(contributorId, keyId, ECDSA_P256_SHA256, payload, Base64.getUrlEncoder().withoutPadding().encodeToString(signer.sign()))
    }

    private fun keyPair() = KeyPairGenerator.getInstance("EC").apply { initialize(ECGenParameterSpec("secp256r1")) }.generateKeyPair()

    private fun fixture() = File("../../contracts/macro-analytics/fixtures/publication-v1-valid.json").readText().replace(Regex("\\s+"), "")

    private data class TestEnvironment(val keyPair: KeyPair, val keyId: String, val credentials: InMemoryContributorCredentialRepository, val publications: InMemoryLatestMacroAnalyticsPublicationRepository, val parser: MacroAnalyticsPublicationWireV1Parser, val authenticateAndIngest: AuthenticateAndIngestMacroAnalyticsPublication) {
        fun registerCredential() {
            credentials.save(ContributorCredential(ContributorId("opaque-random-id"), keyId, ECDSA_P256_SHA256, Base64.getUrlEncoder().withoutPadding().encodeToString(keyPair.public.encoded)))
        }
    }
}
