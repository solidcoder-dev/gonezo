package com.gonezo.multiplatform.plugins.speech

import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactStorageException
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactStore
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationRunStage
import dev.solidcoder.speech.Transcript
import dev.solidcoder.speech.TranscriptionIssue
import dev.solidcoder.speech.TranscriptionIssueSeverity
import org.json.JSONArray
import org.json.JSONObject

internal class SpeechTranscriptionRunFinalizer(
  private val artifactStore: InterpretationArtifactStore,
  private val clockNow: () -> Long = { System.currentTimeMillis() },
) {
  fun completeTranscription(
    runId: String,
    language: String?,
    detectAutomatically: Boolean,
    transcript: Transcript?,
    issues: List<TranscriptionIssue>,
    onResolve: () -> Unit,
    onArtifactStorageFailure: () -> Unit,
    markStorageFailure: () -> Unit,
  ) {
    val transcriptJson = buildTranscriptJson(runId, language, detectAutomatically, transcript, issues)
    try {
      artifactStore.storeTranscript(runId, transcriptJson)
      if (transcript == null) {
        val issue = issues.firstOrNull()?.code?.takeIf { it.isNotBlank() } ?: fallbackInvalidOutputIssue().code
        artifactStore.markFailed(runId, InterpretationRunStage.TRANSCRIPTION, issue)
      }
      onResolve()
    } catch (_: InterpretationArtifactStorageException) {
      runCatching { markStorageFailure() }
      onArtifactStorageFailure()
    }
  }

  fun buildTranscriptJson(
    runId: String,
    language: String?,
    detectAutomatically: Boolean,
    transcript: Transcript?,
    issues: List<TranscriptionIssue>,
  ): String {
    val root = JSONObject()
      .put("version", 1)
      .put("runId", runId)
      .put("createdAtEpochMs", clockNow())
      .put(
        "request",
        JSONObject()
          .put("language", language ?: "auto")
          .put("detectLanguageAutomatically", detectAutomatically),
      )
      .put(
        "result",
        JSONObject().apply {
          if (transcript == null) {
            put("transcript", JSONObject.NULL)
          } else {
            val transcriptSegments = transcript.segments
            put(
              "transcript",
              JSONObject()
                .put("text", transcript.text)
                .put(
                  "segments",
                  JSONObject()
                    .put("text", JSONArray(transcriptSegments.map { it.text }))
                    .put("startMs", JSONArray(transcriptSegments.map { it.startMs }))
                    .put("endMs", JSONArray(transcriptSegments.map { it.endMs }))
                    .put("noSpeechProbability", JSONArray(transcriptSegments.map { it.noSpeechProbability })),
                ),
            )
          }
          put(
            "issues",
            JSONArray(issues.map { issue ->
              JSONObject()
                .put("code", issue.code)
                .put("message", issue.message)
                .put("recoverable", issue.recoverable)
                .put("retryable", issue.retryable)
            }),
          )
        },
      )
    return root.toString()
  }

  private fun fallbackInvalidOutputIssue(): TranscriptionIssue {
    return TranscriptionIssue(
      "transcription-invalid-output",
      "Local speech transcription returned invalid output.",
      TranscriptionIssueSeverity.RECOVERABLE,
    )
  }
}
