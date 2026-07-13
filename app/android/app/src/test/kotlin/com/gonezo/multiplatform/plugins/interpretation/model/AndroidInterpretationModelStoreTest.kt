package com.gonezo.multiplatform.plugins.interpretation.model

import java.io.ByteArrayInputStream
import java.io.File
import java.nio.file.Files
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicInteger
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.StructuredGenerationException
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.assertThrows
import org.junit.Test

class AndroidInterpretationModelStoreTest {
  @Test
  fun `copies the asset to private storage and reuses an already verified copy`() {
    val baseDirectory = Files.createTempDirectory("gonezo-interpretation-model").toFile()
    val assetBytes = "model-bytes".toByteArray()
    val configuration = modelConfiguration(assetBytes)
    val reads = AtomicInteger(0)
    val store = AndroidInterpretationModelStore(
      baseDirectory = baseDirectory,
      assetReader = {
        reads.incrementAndGet()
        ByteArrayInputStream(assetBytes)
      },
      configuration = configuration,
    )

    val first = store.resolveModelPath()
    val second = store.resolveModelPath()

    assertEquals(first, second)
    assertTrue(File(first).exists())
    assertEquals(1, reads.get())
  }

  @Test
  fun `replaces a corrupted copy`() {
    val baseDirectory = Files.createTempDirectory("gonezo-interpretation-model").toFile()
    val assetBytes = "model-bytes".toByteArray()
    val configuration = modelConfiguration(assetBytes)
    val reads = AtomicInteger(0)
    val store = AndroidInterpretationModelStore(
      baseDirectory = baseDirectory,
      assetReader = {
        reads.incrementAndGet()
        ByteArrayInputStream(assetBytes)
      },
      configuration = configuration,
    )

    val path = File(baseDirectory, configuration.fileName)
    path.parentFile?.mkdirs()
    path.writeText("corrupted")

    val resolved = store.resolveModelPath()

    assertEquals(assetBytes.toList(), File(resolved).readBytes().toList())
    assertEquals(1, reads.get())
  }

  @Test
  fun `fails when the asset is missing or the checksum does not match`() {
    val store = AndroidInterpretationModelStore(
      baseDirectory = Files.createTempDirectory("gonezo-interpretation-model").toFile(),
      assetReader = { _ -> throw IllegalStateException("missing") },
      configuration = InterpretationModelConfiguration(
        modelId = "litert-community/Gemma3-1B-IT",
        modelVersion = "dynamic-int4-q4-ekv4096",
        assetPath = "schema-guided-interpretation/litertlm/Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm",
        fileName = "Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm",
        expectedSizeBytes = 584417280L,
        sha256 = "1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be",
      ),
    )

    val exception = assertThrows(StructuredGenerationException::class.java) {
      store.resolveModelPath()
    }
    assertEquals(InterpretationFailureCode.MODEL_UNAVAILABLE, exception.failureCode)
  }

  @Test
  fun `does not copy again when the existing file matches the expected integrity`() {
    val baseDirectory = Files.createTempDirectory("gonezo-interpretation-model").toFile()
    val assetBytes = "model-bytes".toByteArray()
    val configuration = modelConfiguration(assetBytes)
    val reads = AtomicInteger(0)
    val store = AndroidInterpretationModelStore(
      baseDirectory = baseDirectory,
      assetReader = {
        reads.incrementAndGet()
        ByteArrayInputStream(assetBytes)
      },
      configuration = configuration,
    )

    val resolved = store.resolveModelPath()
    val file = File(resolved)
    val before = file.lastModified()
    val second = store.resolveModelPath()

    assertEquals(resolved, second)
    assertEquals(before, File(second).lastModified())
    assertEquals(1, reads.get())
  }

  private fun modelConfiguration(assetBytes: ByteArray): InterpretationModelConfiguration {
    return InterpretationModelConfiguration(
      modelId = "litert-community/Gemma3-1B-IT",
      modelVersion = "dynamic-int4-q4-ekv4096",
      assetPath = "schema-guided-interpretation/litertlm/Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm",
      fileName = "Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm",
      expectedSizeBytes = assetBytes.size.toLong(),
      sha256 = sha256(assetBytes),
    )
  }

  private fun sha256(bytes: ByteArray): String {
    val digest = MessageDigest.getInstance("SHA-256")
    return digest.digest(bytes).joinToString("") { "%02x".format(it) }
  }
}
