package com.gonezo.audioextraction.application.usecase

import com.gonezo.audioextraction.application.pipeline.ExecutionPlanner
import com.gonezo.audioextraction.application.pipeline.RequestGuard
import com.gonezo.audioextraction.application.pipeline.ResolutionCoordinator
import com.gonezo.audioextraction.application.pipeline.ResultAssembler
import com.gonezo.audioextraction.application.pipeline.SourceLoader
import com.gonezo.audioextraction.application.pipeline.StructuredExtractor
import com.gonezo.audioextraction.application.pipeline.TranscriptionEngine
import com.gonezo.audioextraction.application.support.ExtractionRequestScope
import com.gonezo.audioextraction.domain.contract.ContractJsonMapper
import com.gonezo.audioextraction.domain.contract.ExtractionRequest
import com.gonezo.audioextraction.domain.contract.ExtractionResult
import com.gonezo.audioextraction.domain.error.AudioExtractionException
import com.gonezo.audioextraction.domain.error.ErrorCode
import com.gonezo.audioextraction.domain.model.ExecutionPlan
import com.gonezo.audioextraction.domain.model.ExtractionContext
import com.gonezo.audioextraction.domain.model.ResolvedField
import com.gonezo.audioextraction.domain.model.Transcript
import com.gonezo.audioextraction.domain.schema.OutputSchema
import java.util.Locale
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class DefaultAudioExtractionUseCase(
  private val requestGuard: RequestGuard,
  private val executionPlanner: ExecutionPlanner,
  private val sourceLoader: SourceLoader,
  private val transcriptionEngine: TranscriptionEngine,
  private val structuredExtractor: StructuredExtractor,
  private val resolutionCoordinator: ResolutionCoordinator,
  private val resultAssembler: ResultAssembler,
  private val globalTimeoutMs: Long,
) : AudioExtractionUseCase {
  private val cancelledByRequestId = ConcurrentHashMap<String, Boolean>()

  override fun execute(request: ExtractionRequest): ExtractionResult {
    val requestId = UUID.randomUUID().toString()
    val startedAt = System.currentTimeMillis()
    cancelledByRequestId[requestId] = false

    val stageTimings = linkedMapOf<String, Double>()
    val globalIssues = mutableListOf<String>()
    var transcript = Transcript("", emptyList())

    val outputSchema = resolveOutputSchema(request)
    var plan = ExecutionPlan(emptyList(), emptyList(), false)
    var resolved = linkedMapOf<String, ResolvedField>()

    try {
      measureStage(stageTimings, "validate") { requestGuard.validateRequest(request) }
      ensureRunning(requestId, startedAt)

      plan = measureStage(stageTimings, "plan") { executionPlanner.plan(request, outputSchema) }
      ensureRunning(requestId, startedAt)

      val requestWithRequestId = withRequestIdInContext(request, requestId)
      val sourceAudio = measureStage(stageTimings, "load") { sourceLoader.load(requestWithRequestId) }
      ensureRunning(requestId, startedAt)

      transcript = measureStage(stageTimings, "transcribe") { transcriptionEngine.transcribe(sourceAudio) }
      ensureRunning(requestId, startedAt)

      val candidates = measureStage(stageTimings, "extract") {
        ExtractionRequestScope.withRequestId(requestId) {
          structuredExtractor.extract(transcript, plan, outputSchema)
        }
      }
      ensureRunning(requestId, startedAt)

      resolved = LinkedHashMap(measureStage(stageTimings, "resolve") {
        resolutionCoordinator.resolve(candidates, outputSchema, ExtractionContext(requestId, request.context))
      })
      ensureRunning(requestId, startedAt)

      val result = measureStage(stageTimings, "assemble") {
        resultAssembler.assemble(
          requestId,
          plan,
          resolved,
          globalIssues,
          stageTimings,
          transcript,
          plan.includeTranscript,
          elapsedSince(startedAt),
        )
      }

      measureStage(stageTimings, "validateResult") { requestGuard.validateResult(result) }
      return result
    } catch (ex: AudioExtractionException) {
      globalIssues.add(ex.code.name.lowercase(Locale.ROOT))
      return failedResult(requestId, startedAt, stageTimings, globalIssues, transcript, outputSchema, plan, resolved)
    } catch (ex: RuntimeException) {
      globalIssues.add(ErrorCode.RESOLUTION_FAILED.name.lowercase(Locale.ROOT))
      return failedResult(requestId, startedAt, stageTimings, globalIssues, transcript, outputSchema, plan, resolved)
    } finally {
      cancelledByRequestId.remove(requestId)
    }
  }

  override fun cancel(requestId: String) {
    if (requestId.isBlank()) {
      return
    }
    cancelledByRequestId[requestId] = true
  }

  private fun resolveOutputSchema(request: ExtractionRequest): OutputSchema {
    val extraction = request.extraction ?: return OutputSchema()
    return OutputSchema.fromJson(ContractJsonMapper.toJsonObject(extraction.outputSchema))
  }

  private fun withRequestIdInContext(request: ExtractionRequest, requestId: String): ExtractionRequest {
    val context = request.context.toMutableMap()
    context["requestId"] = requestId
    return request.copy(context = context)
  }

  private fun failedResult(
    requestId: String,
    startedAt: Long,
    stageTimings: Map<String, Double>,
    globalIssues: List<String>,
    transcript: Transcript,
    outputSchema: OutputSchema,
    plan: ExecutionPlan,
    resolved: Map<String, ResolvedField>,
  ): ExtractionResult {
    val fallbackResolved = linkedMapOf<String, ResolvedField>()
    fallbackResolved.putAll(resolved)

    for ((fieldName, fieldSchema) in outputSchema.fields) {
      if (fallbackResolved.containsKey(fieldName)) {
        continue
      }
      fallbackResolved[fieldName] =
        ResolvedField(null, 0.0, emptyList(), if (fieldSchema.required) listOf("missing") else emptyList())
    }

    val result = resultAssembler.assemble(
      requestId,
      plan,
      fallbackResolved,
      globalIssues,
      stageTimings,
      transcript,
      plan.includeTranscript,
      elapsedSince(startedAt),
    )

    try {
      requestGuard.validateResult(result)
    } catch (_: RuntimeException) {
      // Return even invalid failure result for diagnostics.
    }
    return result
  }

  private fun ensureRunning(requestId: String, startedAt: Long) {
    if (cancelledByRequestId[requestId] == true) {
      throw AudioExtractionException(ErrorCode.POLICY_REJECTED, "Request was cancelled")
    }
    if (elapsedSince(startedAt) > globalTimeoutMs.toDouble()) {
      throw AudioExtractionException(ErrorCode.POLICY_REJECTED, "Global timeout reached")
    }
  }

  private fun elapsedSince(startedAt: Long): Double = (System.currentTimeMillis() - startedAt).toDouble()

  private fun <T> measureStage(stageTimings: MutableMap<String, Double>, stage: String, operation: () -> T): T {
    val startedAt = System.currentTimeMillis()
    return try {
      operation()
    } finally {
      stageTimings[stage] = (System.currentTimeMillis() - startedAt).toDouble()
    }
  }
}
