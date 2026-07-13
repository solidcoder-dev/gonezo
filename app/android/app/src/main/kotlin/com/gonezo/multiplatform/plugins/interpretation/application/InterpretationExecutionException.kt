package com.gonezo.multiplatform.plugins.interpretation.application

import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.InterpretationFailureDiagnostics
import dev.solidcoder.interpretation.application.FieldInterpretationAttempt
import dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase

internal class InterpretationExecutionException(
  val failureCode: InterpretationFailureCode,
  val recoverable: Boolean,
  val phase: StructuredGenerationFailurePhase,
  val safePublicMessage: String,
  val diagnostics: InterpretationFailureDiagnostics? = null,
  val attempts: List<FieldInterpretationAttempt> = emptyList(),
  cause: Throwable? = null,
) : RuntimeException(safePublicMessage, cause)
