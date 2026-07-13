package com.gonezo.multiplatform.plugins.speech

import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactStorageException
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactStore
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationRunStage
import dev.solidcoder.speech.TranscriptionIssue
import dev.solidcoder.speech.TranscriptionIssueSeverity
import dev.solidcoder.speech.TranscriptionResult
import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SpeechTranscriptionPluginTranscriptPersistenceTest {
  @Test
  fun storesFailedTranscriptionsBeforeMarkingTheRunAsFailed() {
    val calls = mutableListOf<String>()
    val store = RecordingInterpretationArtifactStore(calls)
    val finalizer = SpeechTranscriptionRunFinalizer(store) { 1_784_130_000_000 }
    val runId = "95d831ce-0000-0000-0000-000000000000"
    val result = TranscriptionResult.failure(
      TranscriptionIssue(
        "no-speech-detected",
        "No speech was detected.",
        TranscriptionIssueSeverity.RECOVERABLE,
      ),
    )

    finalizer.completeTranscription(
      runId = runId,
      language = "es",
      detectAutomatically = false,
      transcript = result.transcript,
      issues = result.issues,
      onResolve = {
        calls += "resolve"
      },
      onArtifactStorageFailure = {
        calls += "artifact-storage-failed"
      },
      markStorageFailure = {
        calls += "mark-storage-failed"
      },
    )

    assertEquals(listOf("storeTranscript", "markFailed", "resolve"), calls)
    assertEquals(runId, store.transcriptRunId)
    assertEquals(runId, store.markFailedRunId)
    assertEquals(InterpretationRunStage.TRANSCRIPTION, store.markFailedStage)
    assertEquals("no-speech-detected", store.markFailedCode)

    val transcriptJson = JSONObject(store.transcriptJson!!)
    assertEquals(1, transcriptJson.getInt("version"))
    assertEquals(runId, transcriptJson.getString("runId"))
    assertEquals(1_784_130_000_000, transcriptJson.getLong("createdAtEpochMs"))
    assertEquals("es", transcriptJson.getJSONObject("request").getString("language"))
    assertFalse(transcriptJson.getJSONObject("request").getBoolean("detectLanguageAutomatically"))
    assertTrue(transcriptJson.getJSONObject("result").isNull("transcript"))
    assertEquals("no-speech-detected", transcriptJson.getJSONObject("result").getJSONArray("issues").getJSONObject(0).getString("code"))
  }

  @Test
  fun storesModelUnavailableTranscriptionsBeforeMarkingTheRunAsFailed() {
    val calls = mutableListOf<String>()
    val store = RecordingInterpretationArtifactStore(calls)
    val finalizer = SpeechTranscriptionRunFinalizer(store) { 1_784_130_000_002 }
    val runId = "95d831ce-0000-0000-0000-000000000001"
    val result = TranscriptionResult.failure(
      TranscriptionIssue(
        SpeechTranscriptionFailureCodes.MODEL_UNAVAILABLE,
        "Local speech transcription model is unavailable.",
        TranscriptionIssueSeverity.DEFINITIVE,
      ),
    )

    finalizer.completeTranscription(
      runId = runId,
      language = "es",
      detectAutomatically = false,
      transcript = result.transcript,
      issues = result.issues,
      onResolve = {
        calls += "resolve"
      },
      onArtifactStorageFailure = {
        calls += "artifact-storage-failed"
      },
      markStorageFailure = {
        calls += "mark-storage-failed"
      },
    )

    assertEquals(listOf("storeTranscript", "markFailed", "resolve"), calls)
    assertEquals(runId, store.transcriptRunId)
    assertEquals(runId, store.markFailedRunId)
    assertEquals(InterpretationRunStage.TRANSCRIPTION, store.markFailedStage)
    assertEquals(SpeechTranscriptionFailureCodes.MODEL_UNAVAILABLE, store.markFailedCode)

    val transcriptJson = JSONObject(store.transcriptJson!!)
    assertTrue(transcriptJson.getJSONObject("result").isNull("transcript"))
    assertEquals(SpeechTranscriptionFailureCodes.MODEL_UNAVAILABLE, transcriptJson.getJSONObject("result").getJSONArray("issues").getJSONObject(0).getString("code"))
  }

  @Test
  fun fallsBackToTheInvalidOutputIssueWhenTranscriptionHasNoIssues() {
    val calls = mutableListOf<String>()
    val store = RecordingInterpretationArtifactStore(calls)
    val finalizer = SpeechTranscriptionRunFinalizer(store) { 1_784_130_000_001 }
    val runId = "95d831ce-0000-0000-0000-000000000000"

    finalizer.completeTranscription(
      runId = runId,
      language = "es",
      detectAutomatically = false,
      transcript = null,
      issues = emptyList(),
      onResolve = {
        calls += "resolve"
      },
      onArtifactStorageFailure = {
        calls += "artifact-storage-failed"
      },
      markStorageFailure = {
        calls += "mark-storage-failed"
      },
    )

    assertEquals(listOf("storeTranscript", "markFailed", "resolve"), calls)
    assertEquals("transcription-invalid-output", store.markFailedCode)
    val transcriptJson = JSONObject(store.transcriptJson!!)
    assertEquals("es", transcriptJson.getJSONObject("request").getString("language"))
    assertTrue(transcriptJson.getJSONObject("result").isNull("transcript"))
    assertEquals(0, transcriptJson.getJSONObject("result").getJSONArray("issues").length())
  }

  @Test
  fun returnsArtifactStorageFailedWhenTranscriptPersistenceFails() {
    val calls = mutableListOf<String>()
    val store = RecordingInterpretationArtifactStore(calls).apply {
      failOnStoreTranscript = true
    }
    val finalizer = SpeechTranscriptionRunFinalizer(store)
    val runId = "95d831ce-0000-0000-0000-000000000000"
    val result = TranscriptionResult.failure(
      TranscriptionIssue(
        "no-speech-detected",
        "No speech was detected.",
        TranscriptionIssueSeverity.RECOVERABLE,
      ),
    )

    finalizer.completeTranscription(
      runId = runId,
      language = "es",
      detectAutomatically = false,
      transcript = result.transcript,
      issues = result.issues,
      onResolve = {
        calls += "resolve"
      },
      onArtifactStorageFailure = {
        calls += "artifact-storage-failed"
      },
      markStorageFailure = {
        calls += "mark-storage-failed"
      },
    )

    assertEquals(listOf("storeTranscript", "mark-storage-failed", "artifact-storage-failed"), calls)
    assertNull(store.transcriptJson)
    assertNull(store.markFailedCode)
    assertFalse(store.deleteRunCalled)
  }

  private class RecordingInterpretationArtifactStore(
    private val calls: MutableList<String>,
  ) : InterpretationArtifactStore {
    var transcriptRunId: String? = null
    var transcriptJson: String? = null
    var markFailedRunId: String? = null
    var markFailedStage: InterpretationRunStage? = null
    var markFailedCode: String? = null
    var failOnStoreTranscript = false
    var deleteRunCalled = false

    override fun beginRun(runId: String, createdAtEpochMs: Long): File {
      error("Not used in this test")
    }

    override fun resolveAudio(runId: String): File {
      error("Not used in this test")
    }

    override fun completeAudio(runId: String, metadata: com.gonezo.multiplatform.plugins.interpretation.artifacts.AudioArtifactMetadata) {
      error("Not used in this test")
    }

    override fun storeTranscript(runId: String, transcriptJson: String) {
      calls += "storeTranscript"
      if (failOnStoreTranscript) {
        throw InterpretationArtifactStorageException("storage failed")
      }
      transcriptRunId = runId
      this.transcriptJson = transcriptJson
    }

    override fun storeInterpretation(
      runId: String,
      requestJson: String,
      resultJson: String,
      attempts: List<dev.solidcoder.interpretation.application.FieldInterpretationAttempt>,
    ) {
      error("Not used in this test")
    }

    override fun storeInterpretationFailure(
      runId: String,
      requestJson: String,
      failure: com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationFailureArtifact,
      attempts: List<dev.solidcoder.interpretation.application.FieldInterpretationAttempt>,
    ) {
      error("Not used in this test")
    }

    override fun markFailed(runId: String, stage: InterpretationRunStage, code: String) {
      calls += "markFailed"
      markFailedRunId = runId
      markFailedStage = stage
      markFailedCode = code
    }

    override fun deleteRun(runId: String) {
      deleteRunCalled = true
    }

    override fun cleanupTemporaryArtifacts() {
      error("Not used in this test")
    }
  }
}
