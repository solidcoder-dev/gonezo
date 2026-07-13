package dev.solidcoder.interpretation.application

class FieldOutputDecodingException(
  val violation: FieldOutputViolation,
  message: String,
  cause: Throwable? = null,
) : IllegalArgumentException(message, cause)
