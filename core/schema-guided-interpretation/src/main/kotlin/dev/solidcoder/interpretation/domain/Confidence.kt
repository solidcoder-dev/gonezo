package dev.solidcoder.interpretation.domain

@JvmInline
value class Confidence private constructor(val value: Double) {
  companion object {
    fun of(raw: Double): Confidence {
      require(raw in 0.0..1.0) { "confidence must be between 0.0 and 1.0" }
      return Confidence(raw)
    }
  }

  override fun toString(): String = value.toString()
}
