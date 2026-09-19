package com.gonezo.macroanalytics.ingestion.infrastructure

import com.gonezo.macroanalytics.ingestion.application.PublicationSignatureVerifier
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.X509EncodedKeySpec
import java.util.Base64

class JcaPublicationSignatureVerifier : PublicationSignatureVerifier {
    override fun keyId(subjectPublicKeyInfo: ByteArray): String = deriveKeyId(subjectPublicKeyInfo)

    override fun verify(subjectPublicKeyInfo: ByteArray, payload: ByteArray, signature: ByteArray): Boolean = runCatching {
        val publicKey = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(subjectPublicKeyInfo))
        Signature.getInstance("SHA256withECDSA").run {
            initVerify(publicKey)
            update(payload)
            verify(signature)
        }
    }.getOrDefault(false)

    companion object {
        fun deriveKeyId(subjectPublicKeyInfo: ByteArray): String = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(MessageDigest.getInstance("SHA-256").digest(subjectPublicKeyInfo))
    }
}
