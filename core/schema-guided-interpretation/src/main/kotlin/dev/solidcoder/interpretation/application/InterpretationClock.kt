package dev.solidcoder.interpretation.application

fun interface InterpretationClock {
  fun nowMillis(): Long
}

internal object SystemInterpretationClock : InterpretationClock {
  override fun nowMillis(): Long = System.currentTimeMillis()
}

internal const val GLOBAL_INTERPRETATION_TIMEOUT_MS = 90_000L
