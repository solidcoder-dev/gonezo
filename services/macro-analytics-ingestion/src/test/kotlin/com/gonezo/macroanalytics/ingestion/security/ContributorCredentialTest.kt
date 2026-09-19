package com.gonezo.macroanalytics.ingestion.security

import com.gonezo.macroanalytics.ingestion.application.RegisterContributorCredential
import com.gonezo.macroanalytics.ingestion.infrastructure.InMemoryContributorCredentialRepository
import com.gonezo.macroanalytics.ingestion.infrastructure.JcaPublicationSignatureVerifier
import java.security.KeyPairGenerator
import java.security.spec.ECGenParameterSpec
import kotlin.test.Test
import kotlin.test.assertEquals

class ContributorCredentialTest {
    @Test
    fun `registers a credential after verifying its proof of possession`() {
        val keyPair = KeyPairGenerator.getInstance("EC").apply { initialize(ECGenParameterSpec("secp256r1")) }.generateKeyPair()
        val publicKey = keyPair.public.encoded
        val keyId = JcaPublicationSignatureVerifier().keyId(publicKey)
        val proofBytes = "gonezo-macro-analytics-credential-v1\ncontributor-a\n$keyId".toByteArray(Charsets.UTF_8)
        val signer = java.security.Signature.getInstance("SHA256withECDSA").apply {
            initSign(keyPair.private)
            update(proofBytes)
        }
        val registration = ContributorCredentialRegistrationV1("contributor-a", keyId, "ECDSA_P256_SHA256", publicKey, signer.sign())

        val result = RegisterContributorCredential(InMemoryContributorCredentialRepository(), JcaPublicationSignatureVerifier()).execute(registration)

        assertEquals(ContributorCredentialRegistrationOutcome.REGISTERED, result)
    }
}
