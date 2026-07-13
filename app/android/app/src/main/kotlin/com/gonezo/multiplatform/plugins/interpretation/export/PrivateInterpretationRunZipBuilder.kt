package com.gonezo.multiplatform.plugins.interpretation.export

import java.io.BufferedOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileNotFoundException
import java.io.FileOutputStream
import java.io.IOException
import java.util.UUID
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

class PrivateInterpretationRunZipBuilder(
  private val baseDirectory: File,
  private val cacheDirectory: File,
) : InterpretationRunArchiveBuilder {
  private val allowedArtifactNames = listOf(
    "audio.wav",
    "transcript.v1.json",
    "interpretation.v1.json",
    "manifest.v1.json",
  )

  override fun build(runId: String): File {
    val normalizedRunId = validateRunId(runId)
    val runDirectory = canonicalRunDirectory(normalizedRunId)
    val manifestFile = File(runDirectory, "manifest.v1.json")
    if (!manifestFile.isFile) {
      throw FileNotFoundException("Interpretation run was not found.")
    }

    val archiveFile = temporaryArchiveFile(normalizedRunId)
    archiveFile.parentFile?.let { parent ->
      if (!parent.exists() && !parent.mkdirs()) {
        throw IOException("Interpretation run export directory could not be prepared.")
      }
    }
    if (archiveFile.exists() && !archiveFile.delete()) {
      throw IOException("Interpretation run export file could not be prepared.")
    }

    try {
      ZipOutputStream(BufferedOutputStream(FileOutputStream(archiveFile))).use { zip ->
        for (artifactName in allowedArtifactNames) {
          val artifactFile = File(runDirectory, artifactName)
          if (!artifactFile.isFile) {
            continue
          }
          val canonicalArtifactFile = artifactFile.canonicalFile
          if (!canonicalArtifactFile.path.startsWith(runDirectory.path + File.separator)) {
            throw IOException("Interpretation run artifact path is outside the private storage directory.")
          }
          zip.putNextEntry(ZipEntry(artifactName))
          FileInputStream(canonicalArtifactFile).use { input ->
            input.copyTo(zip)
          }
          zip.closeEntry()
        }
      }
      return archiveFile
    } catch (exception: Exception) {
      archiveFile.delete()
      throw IOException("Diagnostic export failed.", exception)
    }
  }

  fun cleanupTemporaryArtifacts() {
    val exportDirectory = File(cacheDirectory, TEMP_DIRECTORY_NAME)
    if (!exportDirectory.isDirectory) {
      return
    }

    exportDirectory.listFiles()?.forEach { file ->
      if (file.isFile && file.name.endsWith(TEMP_ARCHIVE_SUFFIX)) {
        file.delete()
      }
    }

    exportDirectory.listFiles()
      ?.takeIf { it.isEmpty() }
      ?.let { exportDirectory.delete() }
  }

  private fun temporaryArchiveFile(runId: String): File {
    return File(File(cacheDirectory, TEMP_DIRECTORY_NAME), "gonezo-voice-run-$runId.zip")
  }

  private fun canonicalRunDirectory(runId: String): File {
    val canonicalRunsDirectory = File(baseDirectory.canonicalFile, RUNS_DIRECTORY_NAME).canonicalFile
    val canonicalRunDirectory = File(canonicalRunsDirectory, runId).canonicalFile
    val canonicalRunsPath = canonicalRunsDirectory.path + File.separator
    if (!canonicalRunDirectory.path.startsWith(canonicalRunsPath)) {
      throw IOException("Interpretation run path is outside the private storage directory.")
    }
    if (!canonicalRunDirectory.isDirectory) {
      throw FileNotFoundException("Interpretation run was not found.")
    }
    return canonicalRunDirectory
  }

  private fun validateRunId(runId: String): String {
    val trimmedRunId = runId.trim()
    if (trimmedRunId.isEmpty()) {
      throw IllegalArgumentException("runId is required.")
    }
    return try {
      UUID.fromString(trimmedRunId).toString()
    } catch (exception: IllegalArgumentException) {
      throw IllegalArgumentException("runId must be a valid UUID.", exception)
    }
  }

  companion object {
    private const val RUNS_DIRECTORY_NAME = "interpretation-runs"
    private const val TEMP_DIRECTORY_NAME = "interpretation-run-exports"
    private const val TEMP_ARCHIVE_SUFFIX = ".zip"
  }
}
