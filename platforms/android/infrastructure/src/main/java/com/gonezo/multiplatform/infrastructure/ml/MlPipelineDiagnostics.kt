package com.gonezo.multiplatform.infrastructure.ml

import android.os.SystemClock
import android.util.Log
import java.util.concurrent.ConcurrentHashMap

internal object MlPipelineDiagnostics {
  private const val TAG = "GonezoMlPipeline"
  private val processingStartedAt = ConcurrentHashMap<String, Long>()

  fun transcriptionStarted(runId: String, target: MlExecutionTarget) {
    processingStartedAt[runId] = SystemClock.elapsedRealtime()
    Log.d(
      TAG,
      "recording_stopped transcription_mode=FULL transcription_provider=WHISPER_CPP speech_execution_target=$target",
    )
  }

  fun transcriptionCompleted(runId: String, target: MlExecutionTarget) {
    val startedAt = processingStartedAt[runId] ?: return
    Log.d(
      TAG,
      "transcription_ms=${SystemClock.elapsedRealtime() - startedAt} " +
        "stop_to_final_transcript_ms=${SystemClock.elapsedRealtime() - startedAt} " +
        "speech_execution_target=$target",
    )
  }

  fun draftReady(
    runId: String,
    speechTarget: MlExecutionTarget,
    interpretationTarget: MlExecutionTarget,
  ) {
    val startedAt = processingStartedAt.remove(runId) ?: return
    Log.d(
      TAG,
      "total_processing_ms=${SystemClock.elapsedRealtime() - startedAt} " +
        "speech_execution_target=$speechTarget interpretation_execution_target=$interpretationTarget",
    )
  }

  fun executionPlanResolved(
    rawSocModel: String?,
    resolvedNpuTarget: NpuTarget?,
    plan: MlExecutionPlan,
    interpretationModel: String,
  ) {
    Log.i(
      TAG,
      "raw_soc_model=${rawSocModel ?: "unknown"} " +
        "resolved_npu_target=${resolvedNpuTarget ?: "none"} " +
        "speech_execution_target=${plan.speech} " +
        "interpretation_execution_target=${plan.interpretation} " +
        "interpretation_model=$interpretationModel " +
        "litert_backend=${plan.interpretation.name.lowercase()}",
    )
  }

}
