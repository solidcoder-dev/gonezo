package com.gonezo.multiplatform.plugins.interpretation.artifacts

import dev.solidcoder.interpretation.application.FieldInterpretationAttempt
import java.io.File

internal interface InterpretationArtifactStore {
  fun beginRun(
    runId: String,
    createdAtEpochMs: Long
  ): File

  fun resolveAudio(runId: String): File

  fun completeAudio(
    runId: String,
    metadata: AudioArtifactMetadata
  )

  fun storeTranscript(
    runId: String,
    transcriptJson: String
  )

  fun storeInterpretation(
    runId: String,
    requestJson: String,
    resultJson: String,
    attempts: List<FieldInterpretationAttempt>,
  )

  fun storeInterpretationFailure(
    runId: String,
    requestJson: String,
    failure: InterpretationFailureArtifact,
    attempts: List<FieldInterpretationAttempt>,
  )

  fun markFailed(
    runId: String,
    stage: InterpretationRunStage,
    code: String
  )

  fun deleteRun(runId: String)

  fun cleanupTemporaryArtifacts()
}
