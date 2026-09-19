package com.gonezo.macroanalytics.ingestion.application

interface PublicationSignatureVerifier {
    fun keyId(subjectPublicKeyInfo: ByteArray): String
    fun verify(subjectPublicKeyInfo: ByteArray, payload: ByteArray, signature: ByteArray): Boolean
}
