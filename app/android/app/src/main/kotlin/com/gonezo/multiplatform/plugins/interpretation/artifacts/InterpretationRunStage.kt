package com.gonezo.multiplatform.plugins.interpretation.artifacts

enum class InterpretationRunStage(val wireValue: String) {
  CAPTURE("capture"),
  TRANSCRIPTION("transcription"),
  INTERPRETATION("interpretation"),
  STORAGE("storage"),
}
