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
import java.util.logging.Logger

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
    logInfo(
      "pipeline_execute_start requestId=$requestId schemaVersion=${request.schemaVersion} sourceType=${request.source?.type} sourceRef=${sanitizeSourceRef(request.source?.value)} contextKeys=${request.context.keys}",
    )

    val stageTimings = linkedMapOf<String, Double>()
    val globalIssues = mutableListOf<String>()
    var transcript = Transcript("", emptyList())

    val outputSchema = resolveOutputSchema(request)
    var plan = ExecutionPlan(emptyList(), emptyList(), false)
    var resolved = linkedMapOf<String, ResolvedField>()

    try {
      measureStage(stageTimings, "validate") { requestGuard.validateRequest(request) }
      logInfo("pipeline_stage_ok requestId=$requestId stage=validate durationMs=${stageTimings["validate"]?.toLong() ?: 0}")
      ensureRunning(requestId, startedAt)

      plan = measureStage(stageTimings, "plan") { executionPlanner.plan(request, outputSchema) }
      logInfo(
        "pipeline_stage_ok requestId=$requestId stage=plan durationMs=${stageTimings["plan"]?.toLong() ?: 0} requiredFields=${plan.requiredFields.size} optionalFields=${plan.optionalFields.size} includeTranscript=${plan.includeTranscript}",
      )
      ensureRunning(requestId, startedAt)

      val requestWithRequestId = withRequestIdInContext(request, requestId)
      val sourceAudio = measureStage(stageTimings, "load") { sourceLoader.load(requestWithRequestId) }
      logInfo(
        "pipeline_stage_ok requestId=$requestId stage=load durationMs=${stageTimings["load"]?.toLong() ?: 0} bytesLength=${sourceAudio.bytes.size} sourceRef=${sanitizeSourceRef(sourceAudio.sourceRef)} metadataKeys=${sourceAudio.metadata.keys}",
      )
      ensureRunning(requestId, startedAt)

      transcript = measureStage(stageTimings, "transcribe") { transcriptionEngine.transcribe(sourceAudio) }
      logInfo(
        "pipeline_stage_ok requestId=$requestId stage=transcribe durationMs=${stageTimings["transcribe"]?.toLong() ?: 0} transcriptLength=${transcript.text.length} segments=${transcript.segments.size}",
      )
      ensureRunning(requestId, startedAt)

      val candidates = measureStage(stageTimings, "extract") {
        ExtractionRequestScope.withRequestId(requestId) {
          structuredExtractor.extract(transcript, plan, outputSchema)
        }
      }
      logInfo(
        "pipeline_stage_ok requestId=$requestId stage=extract durationMs=${stageTimings["extract"]?.toLong() ?: 0} candidateFields=${candidates.size}",
      )
      ensureRunning(requestId, startedAt)

      resolved = LinkedHashMap(measureStage(stageTimings, "resolve") {
        resolutionCoordinator.resolve(candidates, outputSchema, ExtractionContext(requestId, request.context))
      })
      logInfo(
        "pipeline_stage_ok requestId=$requestId stage=resolve durationMs=${stageTimings["resolve"]?.toLong() ?: 0} resolvedFields=${resolved.size}",
      )
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
      logInfo(
        "pipeline_stage_ok requestId=$requestId stage=assemble durationMs=${stageTimings["assemble"]?.toLong() ?: 0} outcome=${result.outcome} dataFields=${result.data.size} fieldResults=${result.fieldResults.size} globalIssues=${result.globalIssues.size}",
      )

      measureStage(stageTimings, "validateResult") { requestGuard.validateResult(result) }
      logInfo("pipeline_stage_ok requestId=$requestId stage=validateResult durationMs=${stageTimings["validateResult"]?.toLong() ?: 0}")
      logPipelineEnd(requestId, startedAt, result)
      return result
    } catch (ex: AudioExtractionException) {
      logWarn(
        "pipeline_stage_failed requestId=$requestId code=${ex.code.name.lowercase(Locale.ROOT)} message=${ex.message.orEmpty()} stageTimings=$stageTimings",
      )
      globalIssues.add(ex.code.name.lowercase(Locale.ROOT))
      val result = failedResult(requestId, startedAt, stageTimings, globalIssues, transcript, outputSchema, plan, resolved)
      logPipelineEnd(requestId, startedAt, result)
      return result
    } catch (ex: RuntimeException) {
      logWarn(
        "pipeline_stage_failed requestId=$requestId code=${ErrorCode.RESOLUTION_FAILED.name.lowercase(Locale.ROOT)} reason=${ex.javaClass.simpleName} message=${ex.message.orEmpty()} stageTimings=$stageTimings",
      )
      globalIssues.add(ErrorCode.RESOLUTION_FAILED.name.lowercase(Locale.ROOT))
      val result = failedResult(requestId, startedAt, stageTimings, globalIssues, transcript, outputSchema, plan, resolved)
      logPipelineEnd(requestId, startedAt, result)
      return result
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

  private fun logPipelineEnd(requestId: String, startedAt: Long, result: ExtractionResult) {
    logInfo(
      "pipeline_execute_end requestId=$requestId outcome=${result.outcome} processingTimeMs=${result.processingInfo?.processingTimeMs?.toLong() ?: 0L} wallTimeMs=${elapsedSince(startedAt).toLong()} dataFields=${result.data.size} fieldResults=${result.fieldResults.size} globalIssues=${result.globalIssues.size}",
    )
  }

  private fun sanitizeSourceRef(value: String?): String {
    if (value.isNullOrBlank()) {
      return "n/a"
    }
    return runCatching {
      val uri = java.net.URI.create(value)
      val scheme = uri.scheme ?: return@runCatching value
      if (scheme.equals("http", ignoreCase = true) || scheme.equals("https", ignoreCase = true)) {
        val host = uri.host ?: "unknown-host"
        val port = if (uri.port > 0) ":${uri.port}" else ""
        val path = if (uri.path.isNullOrBlank()) "/" else uri.path
        "$scheme://$host$port$path"
      } else {
        value
      }
    }.getOrDefault(value)
  }

  private fun logInfo(message: String) {
    LOGGER.info(message)
  }

  private fun logWarn(message: String) {
    LOGGER.warning(message)
  }

  private companion object {
    private val LOGGER: Logger = Logger.getLogger("GonezoAudioExtract")
  }
}
