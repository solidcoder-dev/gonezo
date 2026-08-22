package com.gonezo.multiplatform.infrastructure.processing.isolation

internal object StructuredGenerationWorkerProtocol {
  const val ACTION_PREPARE = "com.gonezo.interpretation.PREPARE"
  const val ACTION_GENERATE = "com.gonezo.interpretation.GENERATE"
  const val ACTION_CANCEL = "com.gonezo.interpretation.CANCEL"
  const val ACTION_CLOSE = "com.gonezo.interpretation.CLOSE"

  const val KEY_ACTION = "action"
  const val KEY_REQUEST_ID = "requestId"
  const val KEY_REQUEST = "request"
  const val KEY_SUCCESS = "success"
  const val KEY_OUTPUT = "output"
  const val KEY_ERROR_CODE = "errorCode"
  const val KEY_ERROR_RECOVERABLE = "errorRecoverable"
  const val KEY_ERROR_PHASE = "errorPhase"
  const val KEY_ERROR_MESSAGE = "errorMessage"
  const val KEY_MODEL_CONFIGURATION = "modelConfiguration"
}
