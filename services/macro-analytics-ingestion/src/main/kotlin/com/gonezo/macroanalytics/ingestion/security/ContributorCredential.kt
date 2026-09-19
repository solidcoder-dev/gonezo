package com.gonezo.macroanalytics.ingestion.security

import com.gonezo.macroanalytics.ingestion.domain.ContributorId

const val ECDSA_P256_SHA256 = "ECDSA_P256_SHA256"

data class ContributorCredential(val contributorId: ContributorId, val keyId: String, val algorithm: String, val publicKey: String)

data class ContributorCredentialRegistrationV1(val credentialProtocolVersion: Int, val contributorId: String, val keyId: String, val algorithm: String, val publicKey: String, val proof: String)

enum class ContributorCredentialRegistrationOutcome { REGISTERED, ALREADY_REGISTERED, CREDENTIAL_CONFLICT, INVALID_PROOF }
