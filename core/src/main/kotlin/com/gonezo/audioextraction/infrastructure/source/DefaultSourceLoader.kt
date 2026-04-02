package com.gonezo.audioextraction.infrastructure.source

import com.gonezo.audioextraction.application.pipeline.SourceLoader
import com.gonezo.audioextraction.domain.contract.ExtractionRequest
import com.gonezo.audioextraction.domain.error.AudioExtractionException
import com.gonezo.audioextraction.domain.error.ErrorCode
import com.gonezo.audioextraction.domain.model.SourceAudio
import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.util.Base64
import java.util.Locale
import java.util.logging.Logger

class DefaultSourceLoader : SourceLoader {
  override fun load(request: ExtractionRequest): SourceAudio {
    val source = request.source
      ?: throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "source is required")

    val sourceType = source.type
    val sourceValue = source.value

    if (sourceType.isNullOrBlank() || sourceValue.isNullOrBlank()) {
      throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "source.type and source.value are required")
    }

    val requestId = request.requestIdForLog()
    logInfo(
      "source_load_start requestId=$requestId sourceType=$sourceType sourceRef=${sanitizeSourceRef(sourceType, sourceValue)}",
    )

    val bytes = when (sourceType) {
      "base64" -> decodeBase64(requestId, sourceValue)
      "fileRef" -> loadFromFile(requestId, sourceValue)
      "url" -> loadFromUrl(requestId, sourceValue)
      else -> throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Unsupported source.type: $sourceType")
    }

    val metadata = linkedMapOf<String, Any?>("sourceType" to sourceType)
    val requestIdInContext = request.context["requestId"]
    if (requestIdInContext is String && requestIdInContext.isNotBlank()) {
      metadata["requestId"] = requestIdInContext
    }

    logInfo("source_load_ok requestId=$requestId sourceType=$sourceType bytesLength=${bytes.size}")
    return SourceAudio(bytes, "audio/raw", sourceValue, metadata)
  }

  private fun decodeBase64(requestId: String, value: String): ByteArray =
    try {
      Base64.getDecoder().decode(value).also {
        logInfo("source_base64_decode_ok requestId=$requestId bytesLength=${it.size}")
      }
    } catch (ex: IllegalArgumentException) {
      logWarn("source_base64_decode_failed requestId=$requestId reason=${ex.javaClass.simpleName}")
      throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Invalid base64 source payload", ex)
    }

  private fun loadFromFile(requestId: String, value: String): ByteArray =
    try {
      File(value).readBytes().also {
        logInfo("source_file_read_ok requestId=$requestId path=${File(value).absolutePath} bytesLength=${it.size}")
      }
    } catch (ex: Exception) {
      logWarn("source_file_read_failed requestId=$requestId path=$value reason=${ex.javaClass.simpleName}")
      throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load source fileRef", ex)
    }

  private fun loadFromUrl(requestId: String, value: String): ByteArray {
    val startedAt = System.currentTimeMillis()
    val uri = try {
      URI.create(value)
    } catch (ex: Exception) {
      logWarn("source_url_invalid requestId=$requestId reason=${ex.javaClass.simpleName}")
      throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load source url", ex)
    }
    val safeUrl = sanitizeUrlForLog(uri)

    val connection = try {
      uri.toURL().openConnection() as HttpURLConnection
    } catch (ex: Exception) {
      logWarn("source_url_open_failed requestId=$requestId url=$safeUrl reason=${ex.javaClass.simpleName}")
      throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load source url", ex)
    }

    try {
      connection.connectTimeout = 5_000
      connection.readTimeout = 15_000
      connection.instanceFollowRedirects = false
      connection.requestMethod = "GET"
      connection.connect()

      val status = connection.responseCode
      val contentType = connection.contentType ?: ""
      val contentLength = connection.contentLengthLong
      if (status < 200 || status >= 300) {
        logWarn(
          "source_url_fetch_failed requestId=$requestId url=$safeUrl status=$status contentType=$contentType contentLength=$contentLength elapsedMs=${System.currentTimeMillis() - startedAt}",
        )
        throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load source url (status=$status)")
      }

      val bytes = connection.inputStream.use { it.readBytes() }
      logInfo(
        "source_url_fetch_ok requestId=$requestId url=$safeUrl status=$status contentType=$contentType contentLength=$contentLength bytesLength=${bytes.size} elapsedMs=${System.currentTimeMillis() - startedAt}",
      )
      return bytes
    } catch (ex: AudioExtractionException) {
      throw ex
    } catch (ex: Exception) {
      logWarn(
        "source_url_fetch_exception requestId=$requestId url=$safeUrl reason=${ex.javaClass.simpleName} message=${ex.message.orEmpty()} elapsedMs=${System.currentTimeMillis() - startedAt}",
      )
      throw AudioExtractionException(ErrorCode.INVALID_REQUEST, "Cannot load source url", ex)
    } finally {
      connection.disconnect()
    }
  }

  private fun ExtractionRequest.requestIdForLog(): String {
    val requestId = context["requestId"] as? String
    return requestId?.takeIf { it.isNotBlank() } ?: "n/a"
  }

  private fun sanitizeSourceRef(sourceType: String, sourceValue: String): String =
    when (sourceType.lowercase(Locale.ROOT)) {
      "base64" -> "base64(length=${sourceValue.length})"
      "url" -> runCatching { sanitizeUrlForLog(URI.create(sourceValue)) }.getOrDefault("invalid-url")
      else -> sourceValue
    }

  private fun sanitizeUrlForLog(uri: URI): String {
    val scheme = uri.scheme ?: "unknown"
    val host = uri.host ?: "unknown-host"
    val portPart = if (uri.port > 0) ":${uri.port}" else ""
    val path = if (uri.path.isNullOrBlank()) "/" else uri.path
    return "$scheme://$host$portPart$path"
  }

  private fun logInfo(message: String) {
    LOGGER.info(message)
  }

  private fun logWarn(message: String) {
    LOGGER.warning(message)
  }

  private companion object {
    private val LOGGER: Logger = Logger.getLogger("GonezoAudioExtract")
  }
}
