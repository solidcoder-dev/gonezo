package com.gonezo.multiplatform.plugins.interpretation.artifacts

fun interface InterpretationArtifactClock {
  fun nowEpochMs(): Long
}
