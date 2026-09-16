package com.gonezo.multiplatform.infrastructure.processing.gemini.runtime

import android.content.Context
import android.os.Build
import com.google.mlkit.common.MlKit
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.prompt.Generation
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationException
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationFailurePhase
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRequest
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationResult
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRuntime
import com.gonezo.multiplatform.infrastructure.processing.preparation.ProcessingPreparer
import java.io.Closeable
import kotlinx.coroutines.CancellationException

internal interface GeminiNanoGenerationClient : Closeable {
  suspend fun isAvailable(): Boolean

  suspend fun generate(prompt: String): String
}

internal class MlKitGeminiNanoGenerationClient(
  context: Context,
) : GeminiNanoGenerationClient {
  init {
    MlKit.initialize(context.applicationContext)
  }

  private val model = Generation.getClient()

  override suspend fun isAvailable(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
    return model.checkStatus() == FeatureStatus.AVAILABLE
  }

  override suspend fun generate(prompt: String): String {
    return model.generateContent(prompt).candidates.firstOrNull()?.text.orEmpty()
  }

  override fun close() {
    model.close()
  }
}

internal class GeminiNanoStructuredGenerationRuntime(
  private val client: GeminiNanoGenerationClient,
) : StructuredGenerationRuntime, ProcessingPreparer, Closeable {
  override suspend fun prepare() {
    ensureAvailable()
  }

  override suspend fun generate(request: StructuredGenerationRequest): StructuredGenerationResult {
    if (request.prompt.isBlank()) {
      throw StructuredGenerationException(
        failureCode = InterpretationFailureCode.INVALID_REQUEST,
        recoverable = false,
        phase = StructuredGenerationFailurePhase.GENERATION,
        message = "structured generation prompt is required",
      )
    }
    ensureAvailable()
    try {
      val output = client.generate(request.prompt)
      if (output.isBlank()) {
        throw StructuredGenerationException(
          failureCode = InterpretationFailureCode.INFERENCE_FAILED,
          recoverable = true,
          phase = StructuredGenerationFailurePhase.GENERATION,
          message = "Gemini Nano returned an empty response.",
        )
      }
      return StructuredGenerationResult(output)
    } catch (exception: CancellationException) {
      throw exception
    } catch (exception: StructuredGenerationException) {
      throw exception
    } catch (exception: RuntimeException) {
      throw StructuredGenerationException(
        failureCode = InterpretationFailureCode.INFERENCE_FAILED,
        recoverable = true,
        phase = StructuredGenerationFailurePhase.GENERATION,
        message = "Gemini Nano generation failed.",
        cause = exception,
      )
    }
  }

  override fun close() {
    client.close()
  }

  private suspend fun ensureAvailable() {
    try {
      if (!client.isAvailable()) {
        throw StructuredGenerationException(
          failureCode = InterpretationFailureCode.MODEL_UNAVAILABLE,
          recoverable = true,
          phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
          message = "Gemini Nano is unavailable on this device.",
        )
      }
    } catch (exception: CancellationException) {
      throw exception
    } catch (exception: StructuredGenerationException) {
      throw exception
    } catch (exception: RuntimeException) {
      throw StructuredGenerationException(
        failureCode = InterpretationFailureCode.INFERENCE_FAILED,
        recoverable = true,
        phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
        message = "Gemini Nano could not be initialized.",
        cause = exception,
      )
    }
  }
}
