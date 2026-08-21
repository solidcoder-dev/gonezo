package com.gonezo.multiplatform.infrastructure.configuration

data class AndroidProcessingConfiguration(
  val transcriptionMode: TranscriptionMode,
  val transcriptionProvider: TranscriptionProvider,
  val processingProvider: ProcessingProvider,
)
