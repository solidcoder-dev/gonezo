package com.gonezo.audioextraction.domain.error

class AudioExtractionException(
  val code: ErrorCode,
  message: String,
  cause: Throwable? = null,
) : RuntimeException(message, cause)
