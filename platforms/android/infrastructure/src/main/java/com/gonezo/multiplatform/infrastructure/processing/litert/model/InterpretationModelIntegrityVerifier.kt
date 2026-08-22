package com.gonezo.multiplatform.infrastructure.processing.litert.model

import java.io.File
import java.security.MessageDigest

internal fun interface InterpretationModelIntegrityVerifier {
  fun isValid(file: File, configuration: InterpretationModelConfiguration): Boolean
}

internal object Sha256InterpretationModelIntegrityVerifier : InterpretationModelIntegrityVerifier {
  override fun isValid(file: File, configuration: InterpretationModelConfiguration): Boolean {
    if (!file.isFile || file.length() != configuration.expectedSizeBytes) return false
    return sha256(file) == configuration.sha256
  }

  private fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
      val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
      while (true) {
        val read = input.read(buffer)
        if (read < 0) break
        if (read > 0) digest.update(buffer, 0, read)
      }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
  }
}
