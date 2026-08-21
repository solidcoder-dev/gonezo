package com.gonezo.multiplatform.plugins.speech

import com.gonezo.multiplatform.plugins.interpretation.artifacts.AndroidPrivateInterpretationArtifactStore
import com.gonezo.multiplatform.plugins.interpretation.artifacts.AudioArtifactMetadata
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactCleanupPolicy
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactClock
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationFailureArtifact
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationRuntimeMetadata
import com.gonezo.multiplatform.plugins.interpretation.export.PrivateInterpretationRunZipBuilder
import dev.solidcoder.speech.Transcript
import dev.solidcoder.speech.TranscriptionResult
import java.io.File
import java.nio.file.Files
import java.util.zip.ZipInputStream
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class StreamingTranscriptionPersistenceIntegrationTest {
  @Test
  fun `finalized streaming result is persisted before interpretation export`() {
    val baseDirectory = Files.createTempDirectory("gonezo-streaming-run").toFile()
    val cacheDirectory = Files.createTempDirectory("gonezo-streaming-export").toFile()
    val runId = "11111111-1111-1111-1111-111111111111"
    val store = AndroidPrivateInterpretationArtifactStore(
      baseDirectory = baseDirectory,
      clock = InterpretationArtifactClock { 1_700_000_000_000 },
      cleanupPolicy = InterpretationArtifactCleanupPolicy.DEFAULT,
      deleteDirectoryTree = { directory: File -> directory.deleteRecursively() },
    )
    val finalizer = SpeechTranscriptionRunFinalizer(store) { 1_700_000_000_001 }
    val result = TranscriptionResult.success(Transcript("streamed transcript"))

    val audioFile = store.beginRun(runId, 1_700_000_000_000)
    audioFile.writeBytes(byteArrayOf(1, 2, 3, 4))
    store.completeAudio(runId, AudioArtifactMetadata("audio/wav", 2_000, 4))

    assertTrue(finalizer.finalizeFromResult(runId, "en", false, result))

    val runDirectory = File(File(baseDirectory, "interpretation-runs"), runId)
    assertEquals(
      "streamed transcript",
      JSONObject(File(runDirectory, "transcript.v1.json").readText())
        .getJSONObject("result")
        .getJSONObject("transcript")
        .getString("text"),
    )
    assertEquals(
      "transcript.v1.json",
      JSONObject(File(runDirectory, "manifest.v1.json").readText())
        .getJSONObject("artifacts")
        .getString("transcript"),
    )

    store.storeInterpretationFailure(
      runId = runId,
      requestJson = "{}",
      failure = InterpretationFailureArtifact(
        code = "inference_failed",
        recoverable = true,
        exceptionType = "TestFailure",
        phase = "generation",
        safeMessage = "test failure",
        runtime = InterpretationRuntimeMetadata("test", "1", "gpu"),
      ),
      attempts = emptyList(),
    )

    val archive = PrivateInterpretationRunZipBuilder(baseDirectory, cacheDirectory).build(runId)
    val entries = mutableSetOf<String>()
    ZipInputStream(archive.inputStream()).use { zip ->
      while (true) {
        val entry = zip.nextEntry ?: break
        entries += entry.name
      }
    }
    assertEquals(
      setOf("audio.wav", "transcript.v1.json", "interpretation.v1.json", "manifest.v1.json"),
      entries,
    )
  }
}
