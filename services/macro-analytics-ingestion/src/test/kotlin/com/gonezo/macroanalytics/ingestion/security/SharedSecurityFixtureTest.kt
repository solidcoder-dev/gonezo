package com.gonezo.macroanalytics.ingestion.security

import com.gonezo.macroanalytics.ingestion.application.AuthenticateAndIngestMacroAnalyticsPublication
import com.gonezo.macroanalytics.ingestion.application.IngestMacroAnalyticsPublication
import com.gonezo.macroanalytics.ingestion.application.RegisterContributorCredential
import com.gonezo.macroanalytics.ingestion.infrastructure.InMemoryContributorCredentialRepository
import com.gonezo.macroanalytics.ingestion.infrastructure.InMemoryLatestMacroAnalyticsPublicationRepository
import com.gonezo.macroanalytics.ingestion.infrastructure.JcaPublicationSignatureVerifier
import com.gonezo.macroanalytics.ingestion.infrastructure.MacroAnalyticsPublicationWireV1Parser
import org.json.JSONObject
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class SharedSecurityFixtureTest {
    @Test
    fun `registers and ingests the shared cross-platform security fixtures`() {
        val registrationJson = fixture("credential-registration-v1.json")
        val registration = ContributorCredentialRegistrationV1(
            registrationJson.getInt("credentialProtocolVersion"),
            registrationJson.getString("contributorId"),
            registrationJson.getString("keyId"),
            registrationJson.getString("algorithm"),
            registrationJson.getString("publicKey"),
            registrationJson.getString("proof"),
        )
        val verifier = JcaPublicationSignatureVerifier()
        val credentials = InMemoryContributorCredentialRepository()

        assertEquals(ContributorCredentialRegistrationOutcome.REGISTERED, RegisterContributorCredential(credentials, verifier).execute(registration))

        val signedJson = fixture("signed-publication-v1.json")
        val signedPublication = SignedMacroAnalyticsPublication(
            signedJson.getString("contributorId"),
            signedJson.getString("keyId"),
            signedJson.getString("algorithm"),
            signedJson.getString("payload"),
            signedJson.getString("signature"),
        )
        val repository = InMemoryLatestMacroAnalyticsPublicationRepository()
        val parser = MacroAnalyticsPublicationWireV1Parser()
        val useCase = AuthenticateAndIngestMacroAnalyticsPublication(credentials, verifier, parser, IngestMacroAnalyticsPublication(repository))

        val result = useCase.execute(signedPublication)

        assertEquals(PublicationAuthenticationResult.AUTHENTICATED, result.authentication)
        assertEquals("ACCEPTED", result.ingestion?.outcome?.name)
        assertEquals("fixture-contributor-7", parser.parse(signedPublication.payload).contributorId.value)
    }

    private fun fixture(name: String) = JSONObject(File("../../contracts/macro-analytics/fixtures/security/$name").readText())
}
