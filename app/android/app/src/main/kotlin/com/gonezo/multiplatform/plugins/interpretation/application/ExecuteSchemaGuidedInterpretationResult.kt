package com.gonezo.multiplatform.plugins.interpretation.application

import dev.solidcoder.interpretation.application.FieldInterpretationAttempt

data class ExecuteSchemaGuidedInterpretationResult(
  val resultJson: String,
  val attempts: List<FieldInterpretationAttempt>,
)
