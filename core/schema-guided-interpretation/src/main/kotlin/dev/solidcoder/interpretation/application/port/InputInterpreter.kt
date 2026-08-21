package dev.solidcoder.interpretation.application.port

import dev.solidcoder.interpretation.application.InterpretationOutcome
import dev.solidcoder.interpretation.application.InterpretationRequest

interface InputInterpreter {
    suspend fun interpret(request: InterpretationRequest): InterpretationOutcome
}
