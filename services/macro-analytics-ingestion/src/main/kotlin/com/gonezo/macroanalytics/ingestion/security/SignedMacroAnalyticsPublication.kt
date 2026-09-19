package com.gonezo.macroanalytics.ingestion.security

data class SignedMacroAnalyticsPublication(val contributorId: String, val keyId: String, val algorithm: String, val payload: String, val signature: String)

enum class PublicationAuthenticationResult {
    AUTHENTICATED,
    UNKNOWN_CREDENTIAL,
    CREDENTIAL_MISMATCH,
    INVALID_SIGNATURE,
    CONTRIBUTOR_MISMATCH,
    INVALID_PUBLICATION,
}
