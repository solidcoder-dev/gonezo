package com.gonezo.multiplatform.infrastructure.processing.preparation

internal interface ProcessingPreparer {
  suspend fun prepare()
}
