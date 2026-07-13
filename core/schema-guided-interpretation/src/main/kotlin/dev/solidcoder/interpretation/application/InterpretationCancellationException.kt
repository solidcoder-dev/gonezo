package dev.solidcoder.interpretation.application

class InterpretationCancellationException(
  val attempts: List<FieldInterpretationAttempt>,
  message: String = "The local interpretation was cancelled.",
  cause: Throwable? = null,
) : java.util.concurrent.CancellationException(message) {
  init {
    cause?.let(::initCause)
  }
}
