package com.gonezo.multiplatform.infrastructure.processing.litert.model

import java.io.File
import java.io.IOException
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.Properties

internal class InterpretationModelValidationStore(private val markerFile: File) {
  fun read(): InterpretationModelValidationRecord? {
    if (!markerFile.isFile) return null
    return runCatching {
      val properties = Properties()
      markerFile.inputStream().use(properties::load)
      InterpretationModelValidationRecord(
        schemaVersion = properties.requiredInt("schemaVersion"),
        modelId = properties.required("modelId"),
        modelVersion = properties.required("modelVersion"),
        fileName = properties.required("fileName"),
        expectedSizeBytes = properties.requiredLong("expectedSizeBytes"),
        expectedSha256 = properties.required("expectedSha256"),
        observedSizeBytes = properties.requiredLong("observedSizeBytes"),
        observedLastModified = properties.requiredLong("observedLastModified"),
      )
    }.getOrNull()
  }

  fun write(record: InterpretationModelValidationRecord) {
    markerFile.parentFile?.mkdirs()
    val temporaryFile = File.createTempFile("${markerFile.name}.", ".tmp", markerFile.parentFile)
    try {
      val properties = Properties()
      properties.setProperty("schemaVersion", record.schemaVersion.toString())
      properties.setProperty("modelId", record.modelId)
      properties.setProperty("modelVersion", record.modelVersion)
      properties.setProperty("fileName", record.fileName)
      properties.setProperty("expectedSizeBytes", record.expectedSizeBytes.toString())
      properties.setProperty("expectedSha256", record.expectedSha256)
      properties.setProperty("observedSizeBytes", record.observedSizeBytes.toString())
      properties.setProperty("observedLastModified", record.observedLastModified.toString())
      temporaryFile.outputStream().use { output -> properties.store(output, null) }
      try {
        Files.move(temporaryFile.toPath(), markerFile.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE)
      } catch (_: IOException) {
        Files.move(temporaryFile.toPath(), markerFile.toPath(), StandardCopyOption.REPLACE_EXISTING)
      }
    } finally {
      temporaryFile.delete()
    }
  }

  fun delete() { markerFile.delete() }

  private fun Properties.required(key: String): String = getProperty(key)?.takeIf { it.isNotBlank() }
    ?: throw IllegalArgumentException("Missing validation marker property $key")
  private fun Properties.requiredLong(key: String): Long = required(key).toLong()
  private fun Properties.requiredInt(key: String): Int = required(key).toInt()
}
