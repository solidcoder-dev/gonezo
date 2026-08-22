package com.gonezo.multiplatform.infrastructure.processing.litert.runtime

import com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget
import com.google.ai.edge.litertlm.Backend
import java.io.File
import java.nio.file.Files
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class LiteRtBackendStrategyTest {
  @Test
  fun `maps GPU to LiteRT GPU`() {
    val backend = AndroidLiteRtBackendFactory("/app/lib").create(MlExecutionTarget.GPU)

    assertTrue(backend is Backend.GPU)
  }

  @Test
  fun `maps NPU to LiteRT NPU with the composition root library directory`() {
    val libraryDirectory = Files.createTempDirectory("gonezo-qualcomm-runtime").toFile()
    requiredLibraries().forEach { File(libraryDirectory, it).createNewFile() }
    val backend = AndroidLiteRtBackendFactory(libraryDirectory.absolutePath, NoOpInterpretationRuntimeLogger).create(MlExecutionTarget.NPU)

    assertTrue(backend is Backend.NPU)
    assertEquals(libraryDirectory.absolutePath, (backend as Backend.NPU).nativeLibraryDir)
  }

  @Test
  fun `fails before NPU backend creation when Dispatch is missing`() {
    val libraryDirectory = Files.createTempDirectory("gonezo-qualcomm-runtime").toFile()
    requiredLibraries().filterNot { it == "libLiteRtDispatch_Qualcomm.so" }.forEach {
      File(libraryDirectory, it).createNewFile()
    }

    val error = assertThrows(IllegalStateException::class.java) {
      AndroidLiteRtBackendFactory(libraryDirectory.absolutePath, NoOpInterpretationRuntimeLogger).create(MlExecutionTarget.NPU)
    }

    assertTrue(error.message!!.contains("libLiteRtDispatch_Qualcomm.so"))
  }

  @Test
  fun `fails before NPU backend creation when QNN HTP backend is missing`() {
    val libraryDirectory = Files.createTempDirectory("gonezo-qualcomm-runtime").toFile()
    requiredLibraries().filterNot { it == "libQnnHtp.so" }.forEach {
      File(libraryDirectory, it).createNewFile()
    }

    val error = assertThrows(IllegalStateException::class.java) {
      AndroidLiteRtBackendFactory(libraryDirectory.absolutePath, NoOpInterpretationRuntimeLogger).create(MlExecutionTarget.NPU)
    }

    assertTrue(error.message!!.contains("libQnnHtp.so"))
  }

  @Test
  fun `GPU backend does not require Qualcomm runtime`() {
    val backend = AndroidLiteRtBackendFactory("/missing").create(MlExecutionTarget.GPU)

    assertTrue(backend is Backend.GPU)
  }

  private fun requiredLibraries(): List<String> = listOf(
    "libLiteRtDispatch_Qualcomm.so",
    "libQnnSystem.so",
    "libQnnHtp.so",
    "libQnnHtpV79Stub.so",
    "libQnnHtpV79Skel.so",
  )
}
