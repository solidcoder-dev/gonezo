package com.gonezo.multiplatform.infrastructure.processing.runtime

import com.gonezo.multiplatform.infrastructure.processing.preparation.ProcessingPreparer
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRequest
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationResult
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRuntime
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationException
import java.io.Closeable
import kotlinx.coroutines.CancellationException

internal class FallbackStructuredGenerationRuntime(
  private val preferred: StructuredGenerationRuntime,
  private val fallback: StructuredGenerationRuntime,
) : StructuredGenerationRuntime, ProcessingPreparer, Closeable {
  override suspend fun prepare() {
    try {
      (preferred as? ProcessingPreparer)?.prepare()
    } catch (exception: CancellationException) {
      throw exception
    } catch (exception: StructuredGenerationException) {
      if (!exception.recoverable) throw exception
      (fallback as? ProcessingPreparer)?.prepare()
    } catch (_: RuntimeException) {
      (fallback as? ProcessingPreparer)?.prepare()
    }
  }

  override suspend fun generate(request: StructuredGenerationRequest): StructuredGenerationResult {
    try {
      return preferred.generate(request)
    } catch (exception: CancellationException) {
      throw exception
    } catch (exception: StructuredGenerationException) {
      if (!exception.recoverable) throw exception
    } catch (_: RuntimeException) {
    }
    return fallback.generate(request)
  }

  override fun close() {
    (preferred as? Closeable)?.close()
    (fallback as? Closeable)?.close()
  }
}
