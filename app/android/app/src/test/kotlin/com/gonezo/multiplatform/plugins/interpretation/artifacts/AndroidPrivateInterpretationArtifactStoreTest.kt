package com.gonezo.multiplatform.plugins.interpretation.artifacts

import dev.solidcoder.interpretation.application.FieldInterpretationAttempt
import dev.solidcoder.interpretation.application.FieldInterpretationAttemptStatus
import dev.solidcoder.interpretation.application.FieldPromptVariant
import dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.domain.FieldKey
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import kotlin.io.path.readText

class AndroidPrivateInterpretationArtifactStoreTest {
  @Test
  fun beginRunCreatesAudioAndManifestFiles() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val store = newStore(baseDirectory)
    val runId = "11111111-1111-1111-1111-111111111111"

    val audioFile = store.beginRun(runId, 1_700_000_000_000)

    assertEquals(expectedRunDirectory(baseDirectory, runId).resolve("audio.wav").toFile().canonicalPath, audioFile.canonicalPath)
    assertTrue(audioFile.exists())
    assertTrue(expectedRunDirectory(baseDirectory, runId).resolve("manifest.v1.json").toFile().exists())

    val manifest = readManifest(baseDirectory, runId)
    assertEquals(1, manifest.getInt("version"))
    assertEquals(runId, manifest.getString("runId"))
    assertEquals("recording", manifest.getString("status"))
  }

  @Test
  fun completeAudioUsesTheInjectedClockExactlyOnce() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val clock = FixedClock(1_700_000_100_000)
    val store = newStore(baseDirectory, clock)
    val runId = "11111111-1111-1111-1111-111111111111"
    store.beginRun(runId, 1_700_000_000_000)

    store.completeAudio(runId, AudioArtifactMetadata("audio/wav", 1_234, 5_678))

    assertEquals(listOf(1_700_000_100_000), clock.calls)
    val manifest = readManifest(baseDirectory, runId)
    assertEquals("captured", manifest.getString("status"))
    assertEquals(1_700_000_100_000, manifest.getLong("updatedAtEpochMs"))
    assertEquals("audio/wav", manifest.getJSONObject("audio").getString("mimeType"))
    assertEquals(1_234, manifest.getJSONObject("audio").getLong("durationMs"))
    assertEquals(5_678, manifest.getJSONObject("audio").getLong("sizeBytes"))
  }

  @Test
  fun storeTranscriptUsesTheInjectedClockExactlyOnce() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val clock = FixedClock(1_700_000_200_000)
    val store = newStore(baseDirectory, clock)
    val runId = "11111111-1111-1111-1111-111111111111"
    store.beginRun(runId, 1_700_000_000_000)
    store.completeAudio(runId, AudioArtifactMetadata("audio/wav", 1_234, 5_678))

    clock.calls.clear()
    val transcriptJson = """{"version":1,"runId":"$runId","createdAtEpochMs":1700000001000,"request":{"language":"es"},"result":{"transcript":{"text":"hola","segments":{"text":[],"startMs":[],"endMs":[],"noSpeechProbability":[]}},"issues":[]}}"""
    store.storeTranscript(runId, transcriptJson)

    assertEquals(listOf(1_700_000_200_000), clock.calls)
    assertEquals(transcriptJson, expectedRunDirectory(baseDirectory, runId).resolve("transcript.v1.json").toFile().readText())

    val manifest = readManifest(baseDirectory, runId)
    assertEquals("transcribed", manifest.getString("status"))
    assertEquals(1_700_000_200_000, manifest.getLong("updatedAtEpochMs"))
    assertEquals(1_700_000_200_000, manifest.getJSONObject("transcription").getLong("completedAtEpochMs"))
  }

  @Test
  fun storeTranscriptPersistsTranscriptionFailures() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val clock = FixedClock(1_700_000_250_000)
    val store = newStore(baseDirectory, clock)
    val runId = "11111111-1111-1111-1111-111111111111"
    store.beginRun(runId, 1_700_000_000_000)
    store.completeAudio(runId, AudioArtifactMetadata("audio/wav", 1_234, 5_678))

    val transcriptJson = """{"version":1,"runId":"$runId","createdAtEpochMs":1700000001000,"request":{"language":"es","detectLanguageAutomatically":false},"result":{"transcript":null,"issues":[{"code":"no-speech-detected","message":"No speech was detected in the recording.","recoverable":true,"retryable":true}]}}"""
    store.storeTranscript(runId, transcriptJson)

    val manifest = readManifest(baseDirectory, runId)
    assertEquals("failed", manifest.getString("status"))
    assertEquals("transcription", manifest.getJSONObject("failure").getString("stage"))
    assertEquals("no-speech-detected", manifest.getJSONObject("failure").getString("code"))
    assertEquals(transcriptJson, expectedRunDirectory(baseDirectory, runId).resolve("transcript.v1.json").toFile().readText())
  }

  @Test
  fun storeInterpretationUsesTheInjectedClockExactlyOnce() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val clock = FixedClock(1_700_000_300_000)
    val store = newStore(baseDirectory, clock)
    val runId = "11111111-1111-1111-1111-111111111111"
    store.beginRun(runId, 1_700_000_000_000)
    store.completeAudio(runId, AudioArtifactMetadata("audio/wav", 1_234, 5_678))
    store.storeTranscript(runId, """{"version":1,"runId":"$runId","createdAtEpochMs":1700000001000,"request":{"language":"es"},"result":{"transcript":{"text":"hola","segments":{"text":[],"startMs":[],"endMs":[],"noSpeechProbability":[]}},"issues":[]}}""")

    clock.calls.clear()
    val requestJson = readFixture("interpretation-request.1.json")
    val resultJson = readFixture("interpretation-result.1.json")
    val attempts = listOf(
      attempt(
        fieldKey = "type",
        fieldIndex = 0,
        status = FieldInterpretationAttemptStatus.DECODED,
        durationMs = 90,
        outputLength = 20,
        raw = """{"kind":"resolved","candidate":{"value":{"type":"enum","value":"expense"},"confidence":0.98}}""",
      ),
      attempt(
        fieldKey = "amount",
        fieldIndex = 1,
        status = FieldInterpretationAttemptStatus.DECODED,
        durationMs = 91,
        outputLength = 22,
        raw = """{"kind":"resolved","candidate":{"value":{"type":"decimal","value":"34.80"},"confidence":0.99}}""",
      ),
    )
    store.storeInterpretation(runId, requestJson, resultJson, attempts)

    assertEquals(listOf(1_700_000_300_000), clock.calls)
    val interpretation = JSONObject(expectedRunDirectory(baseDirectory, runId).resolve("interpretation.v1.json").toFile().readText())
    assertEquals(runId, interpretation.getString("runId"))
    assertEquals(JSONObject(requestJson).toString(), interpretation.getJSONObject("request").toString())
    assertEquals(JSONObject(resultJson).toString(), interpretation.getJSONObject("result").toString())
    assertTrue(interpretation.has("interpretations"))
    assertEquals(2, interpretation.getJSONArray("interpretations").length())
    assertEquals("type", interpretation.getJSONArray("interpretations").getJSONObject(0).getString("fieldKey"))
    assertEquals("decoded", interpretation.getJSONArray("interpretations").getJSONObject(0).getString("status"))
    assertEquals(attempts[0].raw, interpretation.getJSONArray("interpretations").getJSONObject(0).getString("raw"))
    assertEquals("amount", interpretation.getJSONArray("interpretations").getJSONObject(1).getString("fieldKey"))
    assertFalse(readManifest(baseDirectory, runId).toString().contains("\"raw\""))

    val manifest = readManifest(baseDirectory, runId)
    assertEquals("interpreted", manifest.getString("status"))
    assertEquals(1_700_000_300_000, manifest.getLong("updatedAtEpochMs"))
    assertEquals(1_700_000_300_000, manifest.getJSONObject("interpretation").getLong("completedAtEpochMs"))
    assertEquals(1, manifest.getJSONObject("interpretation").getInt("resolvedFieldCount"))
    assertEquals("usable", manifest.getJSONObject("interpretation").getString("quality"))
  }

  @Test
  fun storeInterpretationMarksNoUsableFieldsInTheManifest() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val clock = FixedClock(1_700_000_330_000)
    val store = newStore(baseDirectory, clock)
    val runId = "11111111-1111-1111-1111-111111111111"
    store.beginRun(runId, 1_700_000_000_000)
    store.completeAudio(runId, AudioArtifactMetadata("audio/wav", 1_234, 5_678))
    store.storeTranscript(runId, """{"version":1,"runId":"$runId","createdAtEpochMs":1700000001000,"request":{"language":"es"},"result":{"transcript":{"text":"hola","segments":{"text":[],"startMs":[],"endMs":[],"noSpeechProbability":[]}},"issues":[]}}""")

    val requestJson = readFixture("interpretation-request.1.json")
    val resultJson = """{"contractVersion":"1","specId":"gonezo-movement-entry","version":"1","fields":[{"key":"amount","interpretation":{"kind":"missing"}}],"issues":[]}"""
    store.storeInterpretation(runId, requestJson, resultJson, emptyList())

    val manifest = readManifest(baseDirectory, runId)
    assertEquals("interpreted", manifest.getString("status"))
    assertEquals(0, manifest.getJSONObject("interpretation").getInt("resolvedFieldCount"))
    assertEquals("no_usable_fields", manifest.getJSONObject("interpretation").getString("quality"))
  }

  @Test
  fun storeInterpretationFailurePersistsTheFailureArtifactAndManifestCode() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val clock = FixedClock(1_700_000_350_000)
    val store = newStore(baseDirectory, clock)
    val runId = "11111111-1111-1111-1111-111111111111"
    store.beginRun(runId, 1_700_000_000_000)
    store.completeAudio(runId, AudioArtifactMetadata("audio/wav", 1_234, 5_678))
    store.storeTranscript(runId, """{"version":1,"runId":"$runId","createdAtEpochMs":1700000001000,"request":{"language":"es"},"result":{"transcript":{"text":"hola","segments":{"text":[],"startMs":[],"endMs":[],"noSpeechProbability":[]}},"issues":[]}}""")

    clock.calls.clear()
    val attempts = listOf(
      attempt(
        fieldKey = "type",
        fieldIndex = 0,
        status = FieldInterpretationAttemptStatus.DECODED,
        durationMs = 90,
        outputLength = 20,
        raw = """{"kind":"resolved","candidate":{"value":{"type":"enum","value":"expense"},"confidence":0.98}}""",
      ),
      attempt(
        fieldKey = "amount",
        fieldIndex = 1,
        status = FieldInterpretationAttemptStatus.DECODING_FAILED,
        durationMs = 91,
        outputLength = 100,
        raw = """```json
{"kind":"resolved","candidate":{"value":{"type":"decimal","value":"34.80"},"confidence":0.99}}
```""",
        failureCode = InterpretationFailureCode.MALFORMED_OUTPUT,
        phase = StructuredGenerationFailurePhase.DECODING,
      ),
    )
    store.storeInterpretationFailure(
      runId = runId,
      requestJson = readFixture("interpretation-request.1.json"),
      failure = InterpretationFailureArtifact(
        code = "unsupported_device",
        recoverable = false,
        exceptionType = "InterpretationExecutionException",
        phase = "engine_initialization",
        safeMessage = "The device cannot initialize the local model runtime.",
        runtime = InterpretationRuntimeMetadata(
          modelId = "litert-community/Gemma3-1B-IT",
          modelVersion = "dynamic-int4-q4-ekv4096",
          backend = "gpu",
        ),
        outputLength = null,
      ),
      attempts = attempts,
    )

    assertEquals(listOf(1_700_000_350_000), clock.calls)
    val interpretation = JSONObject(expectedRunDirectory(baseDirectory, runId).resolve("interpretation.v1.json").toFile().readText())
    assertEquals("failed", interpretation.getString("status"))
    assertEquals("interpretation", interpretation.getString("stage"))
    assertEquals("engine_initialization", interpretation.getString("phase"))
    assertEquals("unsupported_device", interpretation.getJSONObject("failure").getString("code"))
    assertEquals(false, interpretation.getJSONObject("failure").getBoolean("recoverable"))
    assertEquals("InterpretationExecutionException", interpretation.getJSONObject("failure").getString("exceptionType"))
    assertTrue(interpretation.getJSONObject("generation").isNull("outputLength"))
    assertEquals(2, interpretation.getJSONArray("interpretations").length())
    assertEquals("decoded", interpretation.getJSONArray("interpretations").getJSONObject(0).getString("status"))
    assertEquals("decoding_failed", interpretation.getJSONArray("interpretations").getJSONObject(1).getString("status"))
    assertEquals(attempts[1].raw, interpretation.getJSONArray("interpretations").getJSONObject(1).getString("raw"))
    assertFalse(readManifest(baseDirectory, runId).toString().contains("raw"))

    val manifest = readManifest(baseDirectory, runId)
    assertEquals("failed", manifest.getString("status"))
    assertEquals("interpretation", manifest.getJSONObject("failure").getString("stage"))
    assertEquals("engine_initialization", manifest.getJSONObject("failure").getString("phase"))
    assertEquals("unsupported_device", manifest.getJSONObject("failure").getString("code"))
    assertEquals(false, manifest.getJSONObject("failure").getBoolean("recoverable"))
  }

  @Test
  fun storeInterpretationFailureAlwaysWritesInterpretationsEvenWhenEmpty() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val store = newStore(baseDirectory)
    val runId = "11111111-1111-1111-1111-111111111111"
    store.beginRun(runId, 1_700_000_000_000)
    store.completeAudio(runId, AudioArtifactMetadata("audio/wav", 1_234, 5_678))
    store.storeTranscript(runId, """{"version":1,"runId":"$runId","createdAtEpochMs":1700000001000,"request":{"language":"es"},"result":{"transcript":{"text":"hola","segments":{"text":[],"startMs":[],"endMs":[],"noSpeechProbability":[]}},"issues":[]}}""")

    store.storeInterpretationFailure(
      runId = runId,
      requestJson = readFixture("interpretation-request.1.json"),
      failure = InterpretationFailureArtifact(
        code = "inference_failed",
        recoverable = true,
        exceptionType = "InterpretationExecutionException",
        phase = "generation",
        safeMessage = "Schema-guided interpretation failed.",
        runtime = InterpretationRuntimeMetadata(
          modelId = "litert-community/Gemma3-1B-IT",
          modelVersion = "dynamic-int4-q4-ekv4096",
          backend = "gpu",
        ),
      ),
      attempts = emptyList(),
    )

    val interpretation = JSONObject(expectedRunDirectory(baseDirectory, runId).resolve("interpretation.v1.json").toFile().readText())
    assertTrue(interpretation.has("interpretations"))
    assertEquals(0, interpretation.getJSONArray("interpretations").length())
  }

  @Test
  fun markFailedUsesTheInjectedClockExactlyOnce() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val clock = FixedClock(1_700_000_400_000)
    val store = newStore(baseDirectory, clock)
    val runId = "11111111-1111-1111-1111-111111111111"
    store.beginRun(runId, 1_700_000_000_000)

    store.markFailed(runId, InterpretationRunStage.STORAGE, "artifact-storage-failed")

    assertEquals(listOf(1_700_000_400_000), clock.calls)
    val manifest = readManifest(baseDirectory, runId)
    assertEquals("failed", manifest.getString("status"))
    assertEquals(1_700_000_400_000, manifest.getLong("updatedAtEpochMs"))
    assertEquals("storage", manifest.getJSONObject("failure").getString("stage"))
    assertEquals("artifact-storage-failed", manifest.getJSONObject("failure").getString("code"))
  }

  @Test
  fun deleteRunIsIdempotent() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val store = newStore(baseDirectory)
    val runId = "11111111-1111-1111-1111-111111111111"
    store.beginRun(runId, 1_700_000_000_000)

    store.deleteRun(runId)
    store.deleteRun(runId)

    assertFalse(expectedRunDirectory(baseDirectory, runId).toFile().exists())
  }

  @Test
  fun cleanupPreservesRecentRecordingRunEvenWhenAudioIsEmpty() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val cleanupClock = FixedClock(1_700_000_000_000)
    val store = newStore(baseDirectory, cleanupClock)
    val runId = "11111111-1111-1111-1111-111111111111"
    val createdAtEpochMs = cleanupClock.nowEpochMs - (30 * 60 * 1_000L)
    store.beginRun(runId, createdAtEpochMs)

    store.cleanupTemporaryArtifacts()

    assertTrue(expectedRunDirectory(baseDirectory, runId).toFile().exists())
  }

  @Test
  fun cleanupDeletesStaleRecordingRunEvenWhenAudioHasBytes() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val cleanupClock = FixedClock(1_700_000_000_000)
    val store = newStore(baseDirectory, cleanupClock)
    val runId = "11111111-1111-1111-1111-111111111111"
    val createdAtEpochMs = cleanupClock.nowEpochMs - InterpretationArtifactCleanupPolicy.DEFAULT.staleRecordingAfterMs - 1_000L
    val audioFile = store.beginRun(runId, createdAtEpochMs)
    audioFile.writeBytes(byteArrayOf(1, 2, 3, 4))

    store.cleanupTemporaryArtifacts()

    assertFalse(expectedRunDirectory(baseDirectory, runId).toFile().exists())
  }

  @Test
  fun cleanupPreservesTerminalRunsRegardlessOfAge() {
    val cleanupClock = FixedClock(1_700_000_000_000 + InterpretationArtifactCleanupPolicy.DEFAULT.staleRecordingAfterMs + 1_000L)
    listOf(
      "captured",
      "transcribed",
      "interpreted",
      "failed",
    ).forEachIndexed { index, status ->
      val baseDirectory = Files.createTempDirectory("gonezo-artifacts-$index").toFile()
      val store = newStore(baseDirectory, FixedClock(1_700_000_000_000))
      val runId = listOf(
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
        "33333333-3333-3333-3333-333333333333",
        "44444444-4444-4444-4444-444444444444",
      )[index]
      createRunWithStatus(store, runId, status)

      cleanupClock.nowEpochMs = 1_700_000_000_000 + InterpretationArtifactCleanupPolicy.DEFAULT.staleRecordingAfterMs + 1_000L
      val cleanupStore = newStore(baseDirectory, cleanupClock)
      cleanupStore.cleanupTemporaryArtifacts()

      assertTrue(expectedRunDirectory(baseDirectory, runId).toFile().exists())
    }
  }

  @Test
  fun cleanupPreservesRecentDirectoriesWithoutManifestsAndDeletesStaleOnes() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val clock = FixedClock(1_700_000_000_000 + InterpretationArtifactCleanupPolicy.DEFAULT.staleRecordingAfterMs + 1_000L)
    val store = newStore(baseDirectory, clock)

    val recentRunId = "11111111-1111-1111-1111-111111111111"
    val staleRunId = "22222222-2222-2222-2222-222222222222"
    val recentRunDirectory = expectedRunDirectory(baseDirectory, recentRunId).toFile().apply {
      mkdirs()
      setLastModified(clock.nowEpochMs - 30 * 60 * 1_000L)
    }
    val staleRunDirectory = expectedRunDirectory(baseDirectory, staleRunId).toFile().apply {
      mkdirs()
      setLastModified(clock.nowEpochMs - InterpretationArtifactCleanupPolicy.DEFAULT.staleRecordingAfterMs - 1_000L)
    }

    store.cleanupTemporaryArtifacts()

    assertTrue(recentRunDirectory.exists())
    assertFalse(staleRunDirectory.exists())
  }

  @Test
  fun cleanupPreservesRecentMalformedManifestsAndDeletesStaleOnes() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val clock = FixedClock(1_700_000_000_000 + InterpretationArtifactCleanupPolicy.DEFAULT.staleRecordingAfterMs + 1_000L)
    val store = newStore(baseDirectory, clock)

    val recentRunId = "11111111-1111-1111-1111-111111111111"
    val staleRunId = "22222222-2222-2222-2222-222222222222"
    val recentRunDirectory = expectedRunDirectory(baseDirectory, recentRunId).toFile().apply {
      mkdirs()
      File(this, "manifest.v1.json").writeText("{")
      setLastModified(clock.nowEpochMs - 30 * 60 * 1_000L)
    }
    val staleRunDirectory = expectedRunDirectory(baseDirectory, staleRunId).toFile().apply {
      mkdirs()
      File(this, "manifest.v1.json").writeText("{")
      setLastModified(clock.nowEpochMs - InterpretationArtifactCleanupPolicy.DEFAULT.staleRecordingAfterMs - 1_000L)
    }

    store.cleanupTemporaryArtifacts()

    assertTrue(recentRunDirectory.exists())
    assertFalse(staleRunDirectory.exists())
  }

  @Test
  fun cleanupPreservesRecordingRunsWithFutureTimestamps() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val clock = FixedClock(1_700_000_000_000)
    val store = newStore(baseDirectory, clock)
    val runId = "11111111-1111-1111-1111-111111111111"
    store.beginRun(runId, 1_700_000_000_000 + 60_000L)

    store.cleanupTemporaryArtifacts()

    assertTrue(expectedRunDirectory(baseDirectory, runId).toFile().exists())
  }

  @Test
  fun cleanupKeepsRecentAtomicFileTempArtifactsAndDeletesStaleOnes() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val clock = FixedClock(1_700_000_000_000 + InterpretationArtifactCleanupPolicy.DEFAULT.staleRecordingAfterMs + 1_000L)
    val store = newStore(baseDirectory, clock)

    val recentRunDirectory = expectedRunDirectory(baseDirectory, "11111111-1111-1111-1111-111111111111").toFile().apply {
      mkdirs()
      setLastModified(clock.nowEpochMs - 30 * 60 * 1_000L)
    }
    val staleRunDirectory = expectedRunDirectory(baseDirectory, "22222222-2222-2222-2222-222222222222").toFile().apply {
      mkdirs()
      setLastModified(clock.nowEpochMs - 30 * 60 * 1_000L)
    }
    val recentTempFile = File(recentRunDirectory, "manifest.v1.json.new").apply {
      writeText("recent")
      setLastModified(clock.nowEpochMs - 30 * 60 * 1_000L)
    }
    val staleTempFile = File(staleRunDirectory, "manifest.v1.json.bak").apply {
      writeText("stale")
      setLastModified(clock.nowEpochMs - InterpretationArtifactCleanupPolicy.DEFAULT.staleRecordingAfterMs - 1_000L)
    }

    store.cleanupTemporaryArtifacts()

    assertTrue(recentTempFile.exists())
    assertFalse(staleTempFile.exists())
  }

  @Test
  fun deleteRunThrowsWhenDeletionFails() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val runId = "11111111-1111-1111-1111-111111111111"
    val store = newStore(baseDirectory, deleteDirectoryTree = { false })
    store.beginRun(runId, 1_700_000_000_000)
    val runDirectory = expectedRunDirectory(baseDirectory, runId).toFile()

    assertStorageFailure {
      store.deleteRun(runId)
    }

    assertTrue(runDirectory.exists())
  }

  @Test
  fun cleanupTemporaryArtifactsThrowsWhenDeletionFails() {
    val baseDirectory = Files.createTempDirectory("gonezo-artifacts").toFile()
    val clock = FixedClock(1_700_000_000_000 + InterpretationArtifactCleanupPolicy.DEFAULT.staleRecordingAfterMs + 1_000L)
    val store = newStore(baseDirectory, clock, deleteDirectoryTree = { false })
    val runId = "11111111-1111-1111-1111-111111111111"
    store.beginRun(runId, clock.nowEpochMs - InterpretationArtifactCleanupPolicy.DEFAULT.staleRecordingAfterMs - 1_000L)
    val runDirectory = expectedRunDirectory(baseDirectory, runId).toFile()

    assertStorageFailure {
      store.cleanupTemporaryArtifacts()
    }

    assertTrue(runDirectory.exists())
  }

  @Test(expected = IllegalArgumentException::class)
  fun rejectsInvalidRunIds() {
    val store = newStore(Files.createTempDirectory("gonezo-artifacts").toFile())
    store.beginRun("not-a-uuid", 1_700_000_000_000)
  }

  @Test(expected = IllegalArgumentException::class)
  fun rejectsPathTraversal() {
    val store = newStore(Files.createTempDirectory("gonezo-artifacts").toFile())
    store.resolveAudio("../outside")
  }

  private fun createRunWithStatus(
    store: AndroidPrivateInterpretationArtifactStore,
    runId: String,
    status: String,
  ) {
    val createdAtEpochMs = 1_700_000_000_000L
    store.beginRun(runId, createdAtEpochMs)
    when (status) {
      "captured" -> {
        store.completeAudio(runId, AudioArtifactMetadata("audio/wav", 1_234, 5_678))
      }
      "transcribed" -> {
        store.completeAudio(runId, AudioArtifactMetadata("audio/wav", 1_234, 5_678))
        store.storeTranscript(runId, """{"version":1,"runId":"$runId","createdAtEpochMs":1700000001000,"request":{"language":"es"},"result":{"transcript":{"text":"hola","segments":{"text":[],"startMs":[],"endMs":[],"noSpeechProbability":[]}},"issues":[]}}""")
      }
      "interpreted" -> {
        store.completeAudio(runId, AudioArtifactMetadata("audio/wav", 1_234, 5_678))
        store.storeTranscript(runId, """{"version":1,"runId":"$runId","createdAtEpochMs":1700000001000,"request":{"language":"es"},"result":{"transcript":{"text":"hola","segments":{"text":[],"startMs":[],"endMs":[],"noSpeechProbability":[]}},"issues":[]}}""")
        store.storeInterpretation(
          runId,
          readFixture("interpretation-request.1.json"),
          readFixture("interpretation-result.1.json"),
          emptyList(),
        )
      }
      "failed" -> {
        store.markFailed(runId, InterpretationRunStage.STORAGE, "artifact-storage-failed")
      }
      else -> error("unsupported status $status")
    }
  }

  private fun assertStorageFailure(block: () -> Unit) {
    try {
      block()
      fail("expected InterpretationArtifactStorageException")
    } catch (exception: InterpretationArtifactStorageException) {
      assertEquals("Interpretation run could not be deleted.", exception.message)
    }
  }

  private fun newStore(
    baseDirectory: File,
    clock: FixedClock = FixedClock(1_700_000_000_000),
    deleteDirectoryTree: (File) -> Boolean = { directory -> directory.deleteRecursively() },
  ): AndroidPrivateInterpretationArtifactStore {
    return AndroidPrivateInterpretationArtifactStore(
      baseDirectory = baseDirectory,
      clock = clock,
      cleanupPolicy = InterpretationArtifactCleanupPolicy.DEFAULT,
      deleteDirectoryTree = deleteDirectoryTree,
    )
  }

  private fun readManifest(baseDirectory: File, runId: String): JSONObject {
    return JSONObject(expectedRunDirectory(baseDirectory, runId).resolve("manifest.v1.json").toFile().readText())
  }

  private fun readFixture(name: String): String = Path.of("../../../core/schema-guided-interpretation-json/src/test/resources/fixtures/$name").readText()

  private fun attempt(
    fieldKey: String,
    fieldIndex: Int,
    attemptNumber: Int = 1,
    promptVariant: FieldPromptVariant = FieldPromptVariant.PRIMARY,
    status: FieldInterpretationAttemptStatus,
    durationMs: Long,
    outputLength: Int? = null,
    raw: String? = null,
    failureCode: InterpretationFailureCode? = null,
    phase: StructuredGenerationFailurePhase? = null,
  ): FieldInterpretationAttempt = FieldInterpretationAttempt(
    fieldKey = FieldKey.of(fieldKey),
    fieldIndex = fieldIndex,
    attemptNumber = attemptNumber,
    promptVariant = promptVariant,
    status = status,
    durationMs = durationMs,
    outputLength = outputLength,
    raw = raw,
    failureCode = failureCode,
    phase = phase,
  )

  private fun expectedRunDirectory(baseDirectory: File, runId: String) = baseDirectory
    .toPath()
    .resolve("interpretation-runs")
    .resolve(runId)

  private class FixedClock(
    var nowEpochMs: Long,
  ) : InterpretationArtifactClock {
    val calls = mutableListOf<Long>()

    override fun nowEpochMs(): Long {
      calls += nowEpochMs
      return nowEpochMs
    }
  }
}
