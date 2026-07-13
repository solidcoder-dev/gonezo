package com.gonezo.multiplatform.plugins.interpretation.export

import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.file.Files
import java.util.UUID
import java.util.zip.ZipInputStream
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PrivateInterpretationRunZipBuilderTest {
  @Test
  fun returnsRunNotFoundWhenTheRunDirectoryDoesNotExist() {
    val baseDirectory = Files.createTempDirectory("gonezo-export").toFile()
    val cacheDirectory = Files.createTempDirectory("gonezo-export-cache").toFile()
    val builder = PrivateInterpretationRunZipBuilder(baseDirectory, cacheDirectory)

    try {
      builder.build("11111111-1111-1111-1111-111111111111")
      error("Expected the export builder to reject missing runs.")
    } catch (exception: java.io.FileNotFoundException) {
      assertEquals("Interpretation run was not found.", exception.message)
    }
  }

  @Test
  fun rejectsInvalidRunIds() {
    val baseDirectory = Files.createTempDirectory("gonezo-export").toFile()
    val cacheDirectory = Files.createTempDirectory("gonezo-export-cache").toFile()
    val builder = PrivateInterpretationRunZipBuilder(baseDirectory, cacheDirectory)

    try {
      builder.build("not-a-uuid")
      error("Expected the export builder to reject invalid run identifiers.")
    } catch (exception: IllegalArgumentException) {
      assertEquals("runId must be a valid UUID.", exception.message)
    }
  }

  @Test
  fun includesOnlyExistingRunArtifactsInTheZip() {
    val baseDirectory = Files.createTempDirectory("gonezo-export").toFile()
    val cacheDirectory = Files.createTempDirectory("gonezo-export-cache").toFile()
    val builder = PrivateInterpretationRunZipBuilder(baseDirectory, cacheDirectory)
    val runId = UUID.randomUUID().toString()
    val runDirectory = File(File(baseDirectory, "interpretation-runs"), runId).apply { mkdirs() }
    File(runDirectory, "manifest.v1.json").writeText("""{"runId":"$runId"}""")
    File(runDirectory, "audio.wav").writeBytes(byteArrayOf(1, 2, 3, 4))
    File(runDirectory, "transcript.v1.json").writeText("""{"transcript":"hello"}""")
    File(runDirectory, "interpretation.v1.json").writeText("""{"result":"ok"}""")
    File(runDirectory, "ignored.tmp").writeText("ignore me")
    File(runDirectory, "manifest.v1.json.bak").writeText("ignore me too")

    val archive = builder.build(runId)

    assertTrue(archive.isFile)
    assertTrue(archive.canonicalPath.startsWith(cacheDirectory.canonicalPath))
    assertFalse(File(runDirectory, "ignored.tmp").canonicalPath == archive.canonicalPath)

    val entries = mutableMapOf<String, ByteArray>()
    ZipInputStream(archive.inputStream()).use { zip ->
      while (true) {
        val entry = zip.nextEntry ?: break
        entries[entry.name] = zip.readBytes()
      }
    }

    assertEquals(setOf(
      "audio.wav",
      "transcript.v1.json",
      "interpretation.v1.json",
      "manifest.v1.json",
    ), entries.keys)
    assertArrayEquals(byteArrayOf(1, 2, 3, 4), entries["audio.wav"])
    assertEquals("""{"runId":"$runId"}""", String(entries["manifest.v1.json"]!!))
    assertFalse(entries.keys.any { it.startsWith("/") })
  }

  @Test
  fun exportsOnlyTheArtifactsThatAlreadyExistForFailedRuns() {
    val baseDirectory = Files.createTempDirectory("gonezo-export").toFile()
    val cacheDirectory = Files.createTempDirectory("gonezo-export-cache").toFile()
    val builder = PrivateInterpretationRunZipBuilder(baseDirectory, cacheDirectory)
    val runId = UUID.randomUUID().toString()
    val runDirectory = File(File(baseDirectory, "interpretation-runs"), runId).apply { mkdirs() }
    File(runDirectory, "manifest.v1.json").writeText("""{"runId":"$runId"}""")
    File(runDirectory, "audio.wav").writeBytes(byteArrayOf(9, 8, 7))

    val archive = builder.build(runId)
    val entries = mutableMapOf<String, ByteArray>()
    ZipInputStream(archive.inputStream()).use { zip ->
      while (true) {
        val entry = zip.nextEntry ?: break
        entries[entry.name] = zip.readBytes()
      }
    }

    assertEquals(setOf("audio.wav", "manifest.v1.json"), entries.keys)
  }

  @Test
  fun cleansUpTemporaryArchivesWhenRequested() {
    val baseDirectory = Files.createTempDirectory("gonezo-export").toFile()
    val cacheDirectory = Files.createTempDirectory("gonezo-export-cache").toFile()
    val builder = PrivateInterpretationRunZipBuilder(baseDirectory, cacheDirectory)
    val runId = UUID.randomUUID().toString()
    val runDirectory = File(File(baseDirectory, "interpretation-runs"), runId).apply { mkdirs() }
    File(runDirectory, "manifest.v1.json").writeText("""{"runId":"$runId"}""")

    val archive = builder.build(runId)

    assertTrue(archive.exists())
    builder.cleanupTemporaryArtifacts()
    assertFalse(archive.exists())
  }
}
