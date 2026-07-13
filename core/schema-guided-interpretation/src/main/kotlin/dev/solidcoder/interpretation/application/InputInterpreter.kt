package dev.solidcoder.interpretation.application

interface InputInterpreter {
  suspend fun interpret(request: InterpretationRequest): InterpretationOutcome
}
