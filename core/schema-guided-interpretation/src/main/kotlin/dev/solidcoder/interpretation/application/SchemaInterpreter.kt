package dev.solidcoder.interpretation.application

import dev.solidcoder.interpretation.domain.InterpretationContext
import dev.solidcoder.interpretation.domain.InterpretationResult
import dev.solidcoder.interpretation.domain.InterpretationSpec

interface SchemaInterpreter {
  suspend fun interpret(
    transcript: InputSource,
    spec: InterpretationSpec,
    context: InterpretationContext,
  ): InterpretationResult
}
