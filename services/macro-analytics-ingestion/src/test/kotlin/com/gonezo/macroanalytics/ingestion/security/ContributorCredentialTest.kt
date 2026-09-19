package com.gonezo.macroanalytics.ingestion.security

import com.gonezo.macroanalytics.ingestion.application.RegisterContributorCredential
import com.gonezo.macroanalytics.ingestion.infrastructure.InMemoryContributorCredentialRepository
import com.gonezo.macroanalytics.ingestion.infrastructure.JcaPublicationSignatureVerifier
import java.security.KeyPair
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.Base64
import kotlin.test.Test
import kotlin.test.assertEquals

class ContributorCredentialTest {
    private val verifier = JcaPublicationSignatureVerifier()

    @Test
    fun `registers a credential after verifying its proof of possession`() {
        val repository = InMemoryContributorCredentialRepository()

        val result = RegisterContributorCredential(repository, verifier).execute(registration("contributor-a", keyPair()))

        assertEquals(ContributorCredentialRegistrationOutcome.REGISTERED, result)
    }

    @Test
    fun `repeats the same valid credential idempotently`() {
        val repository = InMemoryContributorCredentialRepository()
        val register = RegisterContributorCredential(repository, verifier)
        val registration = registration("contributor-a", keyPair())

        assertEquals(ContributorCredentialRegistrationOutcome.REGISTERED, register.execute(registration))
        assertEquals(ContributorCredentialRegistrationOutcome.ALREADY_REGISTERED, register.execute(registration))
    }

    @Test
    fun `does not replace a registered key with another valid key`() {
        val repository = InMemoryContributorCredentialRepository()
        val register = RegisterContributorCredential(repository, verifier)
        val original = registration("contributor-a", keyPair())
        val conflicting = registration("contributor-a", keyPair())
        register.execute(original)

        assertEquals(ContributorCredentialRegistrationOutcome.CREDENTIAL_CONFLICT, register.execute(conflicting))
        assertEquals(original.keyId, repository.find(com.gonezo.macroanalytics.ingestion.domain.ContributorId("contributor-a"))?.keyId)
    }

    @Test
    fun `rejects modified contributor key id and proof`() {
        val original = registration("contributor-a", keyPair())
        val register = RegisterContributorCredential(InMemoryContributorCredentialRepository(), verifier)

        assertEquals(ContributorCredentialRegistrationOutcome.INVALID_PROOF, register.execute(original.copy(contributorId = "contributor-b")))
        assertEquals(ContributorCredentialRegistrationOutcome.INVALID_PROOF, register.execute(original.copy(keyId = "different-key")))
        assertEquals(ContributorCredentialRegistrationOutcome.INVALID_PROOF, register.execute(original.copy(proof = "invalid-proof")))
    }

    @Test
    fun `derives a stable unpadded base64url key id from SPKI bytes`() {
        val publicKey = keyPair().public.encoded

        val first = verifier.keyId(publicKey)
        val second = verifier.keyId(publicKey.copyOf())

        assertEquals(first, second)
        assertEquals(43, first.length)
        assertEquals(true, first.matches(Regex("^[A-Za-z0-9_-]+$")))
    }

    private fun registration(contributorId: String, keyPair: KeyPair): ContributorCredentialRegistrationV1 {
        val publicKey = keyPair.public.encoded
        val keyId = verifier.keyId(publicKey)
        val proofBytes = "gonezo-macro-analytics-credential-v1\n$contributorId\n$keyId".toByteArray(Charsets.UTF_8)
        val signer = Signature.getInstance("SHA256withECDSA").apply {
            initSign(keyPair.private)
            update(proofBytes)
        }
        val encoder = Base64.getUrlEncoder().withoutPadding()
        return ContributorCredentialRegistrationV1(1, contributorId, keyId, ECDSA_P256_SHA256, encoder.encodeToString(publicKey), encoder.encodeToString(signer.sign()))
    }

    private fun keyPair() = KeyPairGenerator.getInstance("EC").apply { initialize(ECGenParameterSpec("secp256r1")) }.generateKeyPair()
}
