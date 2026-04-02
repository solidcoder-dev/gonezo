package com.gonezo.audioextraction.infrastructure.source

import com.gonezo.audioextraction.application.pipeline.SourceLoader
import com.gonezo.audioextraction.domain.contract.ExtractionRequest
import com.gonezo.audioextraction.domain.error.AudioExtractionException
import com.gonezo.audioextraction.domain.error.ErrorCode
import com.gonezo.audioextraction.domain.model.SourceAudio
import java.io.File
import java.net.URI
import java.util.Base64

class DefaultSourceLoader : SourceLoader {
  override fun load(request: ExtractionRequest): SourceAudio {
    val source = request.source
      ?: throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "source is required")

    val sourceType = source.type
    val sourceValue = source.value

    if (sourceType.isNullOrBlank() || sourceValue.isNullOrBlank()) {
      throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "source.type and source.value are required")
    }

    val bytes = when (sourceType) {
      "base64" -> decodeBase64(sourceValue)
      "fileRef" -> loadFromFile(sourceValue)
      "url" -> loadFromUrl(sourceValue)
      else -> throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Unsupported source.type: $sourceType")
    }

    val metadata = linkedMapOf<String, Any?>("sourceType" to sourceType)
    val requestId = request.context["requestId"]
    if (requestId is String && requestId.isNotBlank()) {
      metadata["requestId"] = requestId
    }

    return SourceAudio(bytes, "audio/raw", sourceValue, metadata)
  }

  private fun decodeBase64(value: String): ByteArray =
    try {
      Base64.getDecoder().decode(value)
    } catch (ex: IllegalArgumentException) {
      throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Invalid base64 source payload", ex)
    }

  private fun loadFromFile(value: String): ByteArray =
    try {
      File(value).readBytes()
    } catch (ex: Exception) {
      throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load source fileRef", ex)
    }

  private fun loadFromUrl(value: String): ByteArray =
    try {
      URI.create(value).toURL().openStream().use { it.readBytes() }
    } catch (ex: Exception) {
      throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load source url", ex)
    }
}
