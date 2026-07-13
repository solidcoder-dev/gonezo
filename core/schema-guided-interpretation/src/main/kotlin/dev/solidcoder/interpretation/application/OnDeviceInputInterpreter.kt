package dev.solidcoder.interpretation.application

import dev.solidcoder.interpretation.domain.FieldInterpretation
import dev.solidcoder.interpretation.domain.FieldKey
import dev.solidcoder.interpretation.domain.FieldResult
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.InterpretationIssue
import dev.solidcoder.interpretation.domain.InterpretationIssueLevel
import dev.solidcoder.interpretation.domain.InterpretationResult
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.TimeoutCancellationException
import kotlin.coroutines.cancellation.CancellationException
import kotlin.coroutines.coroutineContext

class OnDeviceInputInterpreter(
  private val promptCompiler: FieldInterpretationPromptCompiler,
  private val runtime: StructuredGenerationRuntime,
  private val resultDecoder: FieldInterpretationResultDecoder,
  private val fieldProcessingOrder: FieldProcessingOrder = SpecFieldProcessingOrder,
  private val interpretationClock: InterpretationClock = SystemInterpretationClock,
  private val interpretationTimeoutMs: Long = GLOBAL_INTERPRETATION_TIMEOUT_MS,
) : InputInterpreter {
  override suspend fun interpret(request: InterpretationRequest): InterpretationOutcome {
    val orderedFields = fieldProcessingOrder.orderedFields(request.spec)
    val originalIndexByKey = request.spec.fields.withIndex().associate { (index, field) ->
      field.key to index
    }
    val attempts = mutableListOf<FieldInterpretationAttempt>()
    val fieldInterpretations = linkedMapOf<FieldKey, FieldInterpretation>()
    val issues = mutableListOf<InterpretationIssue>()
    val completedFieldKeys = mutableListOf<FieldKey>()
    val interpretationStartedAt = interpretationClock.nowMillis()

    for (field in orderedFields) {
      coroutineContext.ensureActive()
      val originalFieldIndex = originalIndexByKey.getValue(field.key)
      if (isInterpretationTimedOut(interpretationStartedAt)) {
        return timeoutFailure(
          field = field,
          fieldIndex = originalFieldIndex,
          fieldCount = orderedFields.size,
          interpretationStartedAt = interpretationStartedAt,
          completedFieldKeys = completedFieldKeys,
          attempts = attempts.toList(),
          cause = StructuredGenerationTimeoutException(
            timeoutKind = StructuredGenerationTimeoutKind.GLOBAL_BUDGET,
            message = "The local interpreter timed out before finishing all fields.",
          ),
        )
      }

      val primaryResult = executeAttempt(
        request = request,
        field = field,
        originalFieldIndex = originalFieldIndex,
        attemptNumber = 1,
        promptVariant = FieldPromptVariant.PRIMARY,
        previousViolation = null,
        interpretationStartedAt = interpretationStartedAt,
      )
      when (primaryResult) {
        is FieldInterpretationOutcome.Success -> {
          attempts += primaryResult.attempt
          fieldInterpretations[field.key] = primaryResult.interpretation
          completedFieldKeys += field.key
          continue
        }
        is FieldInterpretationOutcome.Timeout -> {
          attempts += primaryResult.attempt
          if (primaryResult.timeoutKind == StructuredGenerationTimeoutKind.GLOBAL_BUDGET) {
            return timeoutFailure(
              field = field,
              fieldIndex = originalFieldIndex,
              fieldCount = orderedFields.size,
              interpretationStartedAt = interpretationStartedAt,
              completedFieldKeys = completedFieldKeys,
              attempts = attempts.toList(),
              cause = StructuredGenerationTimeoutException(
                timeoutKind = StructuredGenerationTimeoutKind.GLOBAL_BUDGET,
                message = "The local interpreter timed out before finishing all fields.",
              ),
            )
          }
          fieldInterpretations[field.key] = FieldInterpretation.Missing
          issues += fieldGenerationTimeoutIssue(field)
          completedFieldKeys += field.key
          continue
        }
        is FieldInterpretationOutcome.DecodingFailure -> {
          attempts += primaryResult.attempt
          val retryResult = executeAttempt(
            request = request,
            field = field,
            originalFieldIndex = originalFieldIndex,
            attemptNumber = 2,
            promptVariant = FieldPromptVariant.FORMAT_RETRY,
            previousViolation = primaryResult.violation,
            interpretationStartedAt = interpretationStartedAt,
          )
          when (retryResult) {
            is FieldInterpretationOutcome.Success -> {
              attempts += retryResult.attempt
              fieldInterpretations[field.key] = retryResult.interpretation
              completedFieldKeys += field.key
              continue
            }
            is FieldInterpretationOutcome.Timeout -> {
              attempts += retryResult.attempt
              if (retryResult.timeoutKind == StructuredGenerationTimeoutKind.GLOBAL_BUDGET) {
                return timeoutFailure(
                  field = field,
                  fieldIndex = originalFieldIndex,
                  fieldCount = orderedFields.size,
                  interpretationStartedAt = interpretationStartedAt,
                  completedFieldKeys = completedFieldKeys,
                  attempts = attempts.toList(),
                  cause = StructuredGenerationTimeoutException(
                    timeoutKind = StructuredGenerationTimeoutKind.GLOBAL_BUDGET,
                    message = "The local interpreter timed out before finishing all fields.",
                  ),
                )
              }
              fieldInterpretations[field.key] = FieldInterpretation.Missing
              issues += fieldGenerationTimeoutIssue(field)
              completedFieldKeys += field.key
              continue
            }
            is FieldInterpretationOutcome.DecodingFailure -> {
              attempts += retryResult.attempt
              fieldInterpretations[field.key] = FieldInterpretation.Missing
              issues += InterpretationIssue(
                code = "field_output_invalid",
                message = "The local interpreter returned an invalid structured result for this field.",
                level = InterpretationIssueLevel.WARNING,
                fieldKey = field.key,
              )
              completedFieldKeys += field.key
              continue
            }
            is FieldInterpretationOutcome.GenerationFailure -> {
              return failure(
                code = retryResult.failureCode,
                message = retryResult.message,
                recoverable = retryResult.recoverable,
                cause = retryResult.cause,
                diagnostics = diagnostics(
                  field = field,
                  fieldIndex = originalFieldIndex,
                  fieldCount = orderedFields.size,
                  startedAt = retryResult.startedAt,
                  completedFieldKeys = completedFieldKeys,
                  outputLength = retryResult.outputLength,
                  failureCode = retryResult.failureCode,
                  phase = retryResult.phase,
                ),
                attempts = attempts.toList() + retryResult.attempts,
              )
            }
            is FieldInterpretationOutcome.Cancelled -> throw InterpretationCancellationException(
              attempts = attempts.toList() + retryResult.attempts,
              cause = retryResult.cause,
            )
          }
        }
        is FieldInterpretationOutcome.GenerationFailure -> {
          return failure(
            code = primaryResult.failureCode,
            message = primaryResult.message,
            recoverable = primaryResult.recoverable,
            cause = primaryResult.cause,
            diagnostics = diagnostics(
              field = field,
              fieldIndex = originalFieldIndex,
              fieldCount = orderedFields.size,
              startedAt = primaryResult.startedAt,
              completedFieldKeys = completedFieldKeys,
              outputLength = primaryResult.outputLength,
              failureCode = primaryResult.failureCode,
              phase = primaryResult.phase,
            ),
            attempts = attempts.toList() + primaryResult.attempts,
          )
        }
        is FieldInterpretationOutcome.Cancelled -> throw InterpretationCancellationException(
          attempts = attempts.toList() + primaryResult.attempts,
          cause = primaryResult.cause,
        )
      }
    }

    val finalFields = request.spec.fields.map { field ->
      FieldResult(field.key, fieldInterpretations[field.key] ?: FieldInterpretation.Missing)
    }
    return InterpretationOutcome.Success(
      InterpretationResult.forSpec(
        spec = request.spec,
        fields = finalFields,
        issues = issues,
      ),
      attempts = attempts.toList(),
    )
  }

  private suspend fun executeAttempt(
    request: InterpretationRequest,
    field: FieldSpec,
    originalFieldIndex: Int,
    attemptNumber: Int,
    promptVariant: FieldPromptVariant,
    previousViolation: FieldOutputViolation?,
    interpretationStartedAt: Long,
  ): FieldInterpretationOutcome {
    val attemptStartedAt = interpretationClock.nowMillis()
    val attemptBudgetMs = remainingInterpretationBudgetMs(interpretationStartedAt)
    if (attemptBudgetMs <= 0) {
      return FieldInterpretationOutcome.Timeout(
        attempt = generationFailureAttempt(
          field = field,
          fieldIndex = originalFieldIndex,
          startedAt = attemptStartedAt,
          attemptNumber = attemptNumber,
          promptVariant = promptVariant,
          failureCode = InterpretationFailureCode.INFERENCE_FAILED,
          phase = StructuredGenerationFailurePhase.GENERATION,
        ),
        timeoutKind = StructuredGenerationTimeoutKind.GLOBAL_BUDGET,
      )
    }

    val generationRequest = compilePrompt(
      request = request,
      field = field,
      variant = promptVariant,
      previousViolation = previousViolation,
    ).copy(
      fieldKey = field.key.value,
      fieldIndex = originalFieldIndex,
      attemptNumber = attemptNumber,
      promptVariant = promptVariant,
      generationTimeoutMs = attemptBudgetMs,
    )
    val generationResult = try {
      runtime.generate(generationRequest)
    } catch (exception: StructuredGenerationTimeoutException) {
      return FieldInterpretationOutcome.Timeout(
        attempt = generationFailureAttempt(
          field = field,
          fieldIndex = originalFieldIndex,
          startedAt = attemptStartedAt,
          attemptNumber = attemptNumber,
          promptVariant = promptVariant,
          failureCode = InterpretationFailureCode.INFERENCE_FAILED,
          phase = StructuredGenerationFailurePhase.GENERATION,
        ),
        timeoutKind = exception.timeoutKind,
      )
    } catch (exception: StructuredGenerationException) {
      return FieldInterpretationOutcome.GenerationFailure(
        failureCode = exception.failureCode,
        message = exception.message ?: "Local interpretation failed.",
        recoverable = exception.recoverable,
        cause = exception,
        phase = exception.phase ?: StructuredGenerationFailurePhase.GENERATION,
        outputLength = null,
        startedAt = attemptStartedAt,
        attempts = listOf(
          generationFailureAttempt(
            field = field,
            fieldIndex = originalFieldIndex,
            startedAt = attemptStartedAt,
            attemptNumber = attemptNumber,
            promptVariant = promptVariant,
            failureCode = exception.failureCode,
            phase = exception.phase ?: StructuredGenerationFailurePhase.GENERATION,
          ),
        ),
      )
    } catch (exception: TimeoutCancellationException) {
      return FieldInterpretationOutcome.Timeout(
        attempt = generationFailureAttempt(
          field = field,
          fieldIndex = originalFieldIndex,
          startedAt = attemptStartedAt,
          attemptNumber = attemptNumber,
          promptVariant = promptVariant,
          failureCode = InterpretationFailureCode.INFERENCE_FAILED,
          phase = StructuredGenerationFailurePhase.GENERATION,
        ),
        timeoutKind = StructuredGenerationTimeoutKind.INDIVIDUAL,
      )
    } catch (exception: CancellationException) {
      return FieldInterpretationOutcome.Cancelled(
        attempts = listOf(
          cancelledAttempt(
            field = field,
            fieldIndex = originalFieldIndex,
            startedAt = attemptStartedAt,
            attemptNumber = attemptNumber,
            promptVariant = promptVariant,
          ),
        ),
        cause = exception,
      )
    } catch (exception: RuntimeException) {
      return FieldInterpretationOutcome.GenerationFailure(
        failureCode = InterpretationFailureCode.INFERENCE_FAILED,
        message = "Local interpretation failed.",
        recoverable = true,
        cause = exception,
        phase = StructuredGenerationFailurePhase.GENERATION,
        outputLength = null,
        startedAt = attemptStartedAt,
        attempts = listOf(
          generationFailureAttempt(
            field = field,
            fieldIndex = originalFieldIndex,
            startedAt = attemptStartedAt,
            attemptNumber = attemptNumber,
            promptVariant = promptVariant,
            failureCode = InterpretationFailureCode.INFERENCE_FAILED,
            phase = StructuredGenerationFailurePhase.GENERATION,
          ),
        ),
      )
    }

    val raw = generationResult.output
    val attempt = FieldInterpretationAttempt(
      fieldKey = field.key,
      fieldIndex = originalFieldIndex,
      attemptNumber = attemptNumber,
      promptVariant = promptVariant,
      status = FieldInterpretationAttemptStatus.DECODED,
      durationMs = interpretationClock.nowMillis() - attemptStartedAt,
      outputLength = raw.length,
      raw = raw,
    )

    return try {
      val interpretation = resultDecoder.decode(field, generationResult)
      FieldInterpretationOutcome.Success(interpretation, attempt)
    } catch (exception: FieldOutputDecodingException) {
      FieldInterpretationOutcome.DecodingFailure(
        attempt = attempt.copy(
          status = FieldInterpretationAttemptStatus.DECODING_FAILED,
          failureCode = InterpretationFailureCode.MALFORMED_OUTPUT,
          phase = StructuredGenerationFailurePhase.DECODING,
        ),
        violation = exception.violation,
        raw = raw,
      )
    } catch (exception: CancellationException) {
      FieldInterpretationOutcome.Cancelled(
        attempts = listOf(
          attempt.copy(
            status = FieldInterpretationAttemptStatus.CANCELLED,
            failureCode = InterpretationFailureCode.CANCELLED,
            phase = StructuredGenerationFailurePhase.DECODING,
          ),
        ),
        cause = exception,
      )
    } catch (exception: RuntimeException) {
      FieldInterpretationOutcome.GenerationFailure(
        failureCode = InterpretationFailureCode.INFERENCE_FAILED,
        message = "Local interpretation failed.",
        recoverable = true,
        cause = exception,
        phase = StructuredGenerationFailurePhase.DECODING,
        outputLength = raw.length,
        startedAt = attemptStartedAt,
        attempts = listOf(
          attempt.copy(
            status = FieldInterpretationAttemptStatus.DECODING_FAILED,
            failureCode = InterpretationFailureCode.INFERENCE_FAILED,
            phase = StructuredGenerationFailurePhase.DECODING,
          ),
        ),
      )
    }
  }

  private fun compilePrompt(
    request: InterpretationRequest,
    field: FieldSpec,
    variant: FieldPromptVariant,
    previousViolation: FieldOutputViolation? = null,
  ): StructuredGenerationRequest = promptCompiler.compile(request, field, variant, previousViolation)

  private fun remainingInterpretationBudgetMs(interpretationStartedAt: Long): Long {
    return interpretationTimeoutMs - (interpretationClock.nowMillis() - interpretationStartedAt)
  }

  private fun isInterpretationTimedOut(interpretationStartedAt: Long): Boolean {
    return remainingInterpretationBudgetMs(interpretationStartedAt) <= 0
  }

  private fun timeoutFailure(
    field: FieldSpec?,
    fieldIndex: Int?,
    fieldCount: Int,
    interpretationStartedAt: Long,
    completedFieldKeys: List<FieldKey>,
    attempts: List<FieldInterpretationAttempt>,
    cause: StructuredGenerationTimeoutException,
  ): InterpretationOutcome.Failure = failure(
    code = InterpretationFailureCode.INFERENCE_FAILED,
    message = "The local interpreter timed out before finishing all fields.",
    recoverable = true,
    cause = cause,
    diagnostics = InterpretationFailureDiagnostics(
      fieldKey = field?.key,
      fieldIndex = fieldIndex,
      fieldCount = fieldCount,
      durationMs = interpretationClock.nowMillis() - interpretationStartedAt,
      outputLength = null,
      completedFieldKeys = completedFieldKeys.toList(),
      failedFieldKey = field?.key,
      failureCode = InterpretationFailureCode.INFERENCE_FAILED,
      phase = StructuredGenerationFailurePhase.GENERATION,
    ),
    attempts = attempts,
  )

  private fun fieldGenerationTimeoutIssue(field: FieldSpec): InterpretationIssue = InterpretationIssue(
    code = "field_generation_timeout",
    message = "The local interpreter timed out for this field.",
    level = InterpretationIssueLevel.WARNING,
    fieldKey = field.key,
  )

  private fun failure(
    code: InterpretationFailureCode,
    message: String,
    recoverable: Boolean,
    cause: Throwable,
    diagnostics: InterpretationFailureDiagnostics,
    attempts: List<FieldInterpretationAttempt>,
  ): InterpretationOutcome.Failure = InterpretationOutcome.Failure(
    InterpretationFailure(
      code = code,
      message = message,
      recoverable = recoverable,
      diagnostics = diagnostics,
      cause = cause,
    ),
    attempts = attempts,
  )

  private fun diagnostics(
    field: FieldSpec,
    fieldIndex: Int,
    fieldCount: Int,
    startedAt: Long,
    completedFieldKeys: List<FieldKey>,
    failureCode: InterpretationFailureCode,
    phase: StructuredGenerationFailurePhase,
    outputLength: Int? = null,
  ): InterpretationFailureDiagnostics = InterpretationFailureDiagnostics(
    fieldKey = field.key,
    fieldIndex = fieldIndex,
    fieldCount = fieldCount,
    durationMs = interpretationClock.nowMillis() - startedAt,
    outputLength = outputLength,
    completedFieldKeys = completedFieldKeys.toList(),
    failedFieldKey = field.key,
    failureCode = failureCode,
    phase = phase,
  )

  private fun generationFailureAttempt(
    field: FieldSpec,
    fieldIndex: Int,
    startedAt: Long,
    attemptNumber: Int,
    promptVariant: FieldPromptVariant,
    failureCode: InterpretationFailureCode,
    phase: StructuredGenerationFailurePhase,
  ): FieldInterpretationAttempt = FieldInterpretationAttempt(
    fieldKey = field.key,
    fieldIndex = fieldIndex,
    attemptNumber = attemptNumber,
    promptVariant = promptVariant,
    status = FieldInterpretationAttemptStatus.GENERATION_FAILED,
    durationMs = interpretationClock.nowMillis() - startedAt,
    outputLength = null,
    raw = null,
    failureCode = failureCode,
    phase = phase,
  )

  private fun cancelledAttempt(
    field: FieldSpec,
    fieldIndex: Int,
    startedAt: Long,
    attemptNumber: Int,
    promptVariant: FieldPromptVariant,
  ): FieldInterpretationAttempt = FieldInterpretationAttempt(
    fieldKey = field.key,
    fieldIndex = fieldIndex,
    attemptNumber = attemptNumber,
    promptVariant = promptVariant,
    status = FieldInterpretationAttemptStatus.CANCELLED,
    durationMs = interpretationClock.nowMillis() - startedAt,
    outputLength = null,
    raw = null,
    failureCode = InterpretationFailureCode.CANCELLED,
    phase = StructuredGenerationFailurePhase.DECODING,
  )

  private sealed interface FieldInterpretationOutcome {
    data class Success(val interpretation: FieldInterpretation, val attempt: FieldInterpretationAttempt) : FieldInterpretationOutcome

    data class DecodingFailure(val attempt: FieldInterpretationAttempt, val violation: FieldOutputViolation, val raw: String) : FieldInterpretationOutcome

    data class Timeout(val attempt: FieldInterpretationAttempt, val timeoutKind: StructuredGenerationTimeoutKind) : FieldInterpretationOutcome

    data class GenerationFailure(
      val failureCode: InterpretationFailureCode,
      val message: String,
      val recoverable: Boolean,
      val cause: Throwable,
      val phase: StructuredGenerationFailurePhase,
      val outputLength: Int?,
      val startedAt: Long,
      val attempts: List<FieldInterpretationAttempt>,
    ) : FieldInterpretationOutcome

    data class Cancelled(
      val attempts: List<FieldInterpretationAttempt>,
      val cause: CancellationException,
    ) : FieldInterpretationOutcome
  }

}
