package com.gonezo.multiplatform.plugins.interpretation

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.gonezo.multiplatform.plugins.interpretation.artifacts.AndroidPrivateInterpretationArtifactStore
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactStorageException
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationArtifactStore
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationFailureArtifact
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationRunStage
import com.gonezo.multiplatform.plugins.interpretation.artifacts.InterpretationRuntimeMetadata
import com.gonezo.multiplatform.plugins.interpretation.application.ExecuteSchemaGuidedInterpretation
import com.gonezo.multiplatform.plugins.interpretation.application.InterpretationExecutionException
import com.gonezo.multiplatform.plugins.interpretation.bootstrap.SchemaGuidedInterpretationCompositionRoot
import dev.solidcoder.interpretation.application.InterpretationCancellationException
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase
import dev.solidcoder.interpretation.json.InterpretationJsonCodec
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.runBlocking

@CapacitorPlugin(name = "SchemaGuidedInterpretationPlugin")
class SchemaGuidedInterpretationPlugin : Plugin() {
  private val executor = Executors.newCachedThreadPool { runnable ->
    Thread(runnable, "GonezoSchemaGuidedInterpretation")
  }
  private val cancellationExecutor = Executors.newCachedThreadPool { runnable ->
    Thread(runnable, "GonezoSchemaGuidedInterpretationCancellation")
  }
  private val codec = InterpretationJsonCodec()
  private lateinit var artifactStore: InterpretationArtifactStore
  private lateinit var compositionRoot: SchemaGuidedInterpretationCompositionRoot
  private lateinit var executeInterpretation: ExecuteSchemaGuidedInterpretation
  private val activeRequests = ConcurrentHashMap<String, ActiveInterpretationOperation>()

  override fun load() {
    compositionRoot = SchemaGuidedInterpretationCompositionRoot(context.applicationContext)
    artifactStore = AndroidPrivateInterpretationArtifactStore(context.noBackupFilesDir)
    executeInterpretation =
      ExecuteSchemaGuidedInterpretation(
        inputInterpreter = compositionRoot.createInputInterpreter(),
        codec = codec,
      )
    try {
      artifactStore.cleanupTemporaryArtifacts()
    } catch (_: InterpretationArtifactStorageException) {
    }
  }

  @PluginMethod
  fun interpret(call: PluginCall) {
    val runId = try {
      requireRunId(call)
    } catch (exception: IllegalArgumentException) {
      reject(call, "invalid_request", exception.message ?: "Invalid schema-guided interpretation request.", false)
      return
    }
    val requestId = call.getString("requestId")
    val requestJson = call.getString("requestJson")
    if (requestId.isNullOrBlank() || requestJson.isNullOrBlank()) {
      reject(call, "invalid_request", "runId, requestId and requestJson are required", false)
      return
    }

    val operation = ActiveInterpretationOperation(
      requestId = requestId,
      runId = runId,
      requestJson = requestJson,
      call = call,
    )
    if (activeRequests.putIfAbsent(requestId, operation) != null) {
      reject(call, "invalid_request", "requestId is already active.", false)
      return
    }

    val future = executor.submit {
      try {
        if (operation.cancelRequested.get()) {
          completeCancelledOperation(operation)
          return@submit
        }

        val execution = try {
          runBlocking {
            executeInterpretation.execute(requestJson)
          }
        } catch (exception: InterpretationCancellationException) {
          storeCancellationInterpretation(runId, requestJson, exception)
          completeCancelledOperation(operation)
          return@submit
        } catch (exception: InterpretationExecutionException) {
          storeInterpretationFailure(
            runId = runId,
            requestJson = requestJson,
            failure = interpretationFailureArtifact(exception),
            attempts = exception.attempts,
          )
          reject(operation.call, exception.failureCode.toExternalCode(), exception.safePublicMessage, exception.recoverable)
          return@submit
        } catch (exception: CancellationException) {
          storeCancellationInterpretation(runId, requestJson, null)
          completeCancelledOperation(operation)
          return@submit
        } catch (exception: RuntimeException) {
          val failure = InterpretationExecutionException(
            failureCode = InterpretationFailureCode.INFERENCE_FAILED,
            recoverable = true,
            phase = StructuredGenerationFailurePhase.GENERATION,
            safePublicMessage = "Schema-guided interpretation failed.",
            cause = exception,
          )
          storeInterpretationFailure(
            runId = runId,
            requestJson = requestJson,
            failure = interpretationFailureArtifact(failure),
            attempts = failure.attempts,
          )
          reject(operation.call, failure.failureCode.toExternalCode(), failure.safePublicMessage, failure.recoverable)
          return@submit
        }

        if (operation.cancelRequested.get()) {
          completeCancelledOperation(operation)
          return@submit
        }

        try {
          artifactStore.storeInterpretation(
            runId = runId,
            requestJson = requestJson,
            resultJson = execution.resultJson,
            attempts = execution.attempts,
          )
        } catch (exception: InterpretationArtifactStorageException) {
          if (operation.cancelRequested.get()) {
            completeCancelledOperation(operation)
            return@submit
          }
          markFailed(runId, InterpretationRunStage.STORAGE, "artifact-storage-failed")
          rejectArtifactStorage(operation.call)
          return@submit
        }

        if (operation.cancelRequested.get()) {
          completeCancelledOperation(operation)
          return@submit
        }

        val payload = JSObject()
        payload.put("kind", "success")
        payload.put("resultJson", execution.resultJson)
        resolveOnce(operation, payload)
      } catch (exception: IllegalArgumentException) {
        if (operation.cancelRequested.get()) {
          completeCancelledOperation(operation)
          return@submit
        }
        markFailed(runId, InterpretationRunStage.INTERPRETATION, "invalid_request")
        reject(operation.call, "invalid_request", exception.message ?: "Invalid schema-guided interpretation request.", false)
      } catch (exception: InterpretationArtifactStorageException) {
        if (operation.cancelRequested.get()) {
          completeCancelledOperation(operation)
          return@submit
        }
        markFailed(runId, InterpretationRunStage.STORAGE, "artifact-storage-failed")
        rejectArtifactStorage(operation.call)
      } catch (exception: RuntimeException) {
        if (operation.cancelRequested.get()) {
          completeCancelledOperation(operation)
          return@submit
        }
        val failure = InterpretationExecutionException(
          failureCode = InterpretationFailureCode.INFERENCE_FAILED,
          recoverable = true,
          phase = StructuredGenerationFailurePhase.GENERATION,
          safePublicMessage = "Schema-guided interpretation failed.",
          cause = exception,
        )
        storeInterpretationFailure(
          runId = runId,
          requestJson = requestJson,
          failure = interpretationFailureArtifact(failure),
          attempts = failure.attempts,
        )
        reject(operation.call, failure.failureCode.toExternalCode(), failure.safePublicMessage, failure.recoverable)
      } finally {
        operation.completion.countDown()
        activeRequests.remove(requestId, operation)
      }
    }

    operation.future.set(future)
    if (operation.cancelRequested.get()) {
      future.cancel(true)
    }
  }

  @PluginMethod
  fun cancel(call: PluginCall) {
    val requestId = call.getString("requestId")
    if (requestId.isNullOrBlank()) {
      call.resolve()
      return
    }

    val operation = activeRequests[requestId]
    if (operation == null) {
      call.resolve()
      return
    }

    operation.cancelRequested.set(true)
    operation.future.get()?.cancel(true)
    cancellationExecutor.execute {
      val completed = try {
        operation.completion.await(CANCELLATION_TIMEOUT_SECONDS, TimeUnit.SECONDS)
      } catch (_: InterruptedException) {
        Thread.currentThread().interrupt()
        false
      }
      if (completed) {
        resolveOnMainThread(call)
      } else {
        rejectOnMainThread(
          call,
          "interpretation-cancellation-failed",
          "Schema-guided interpretation cancellation timed out.",
          true,
        )
      }
    }
  }

  override fun handleOnDestroy() {
    activeRequests.values.forEach { operation ->
      operation.cancelRequested.set(true)
    }
    activeRequests.values.forEach { operation ->
      operation.future.get()?.cancel(true)
    }
    activeRequests.clear()
    if (::compositionRoot.isInitialized) {
      compositionRoot.close()
    }
    cancellationExecutor.shutdownNow()
    executor.shutdownNow()
    super.handleOnDestroy()
  }

  private fun resolveOnce(operation: ActiveInterpretationOperation, payload: JSObject) {
    if (operation.originalResponseCompleted.compareAndSet(false, true)) {
      resolveOnMainThread(operation.call, payload)
    }
  }

  private fun completeCancelledOperation(operation: ActiveInterpretationOperation) {
    if (operation.originalResponseCompleted.compareAndSet(false, true)) {
      rejectOnMainThread(
        operation.call,
        "cancelled",
        "Interpretation was cancelled.",
        true,
      )
    }
  }

  private fun resolveOnMainThread(call: PluginCall, payload: JSObject = JSObject()) {
    getBridge().executeOnMainThread { call.resolve(payload) }
  }

  private fun rejectOnMainThread(call: PluginCall, code: String, message: String, recoverable: Boolean) {
    getBridge().executeOnMainThread {
      call.reject(message, code, JSObject().put("recoverable", recoverable))
    }
  }

  private fun reject(call: PluginCall, code: String, message: String, recoverable: Boolean) {
    getBridge().executeOnMainThread {
      call.reject(message, code, JSObject().put("recoverable", recoverable))
    }
  }

  private fun rejectArtifactStorage(call: PluginCall) {
    getBridge().executeOnMainThread {
      call.reject("Interpretation artifact storage failed.", "artifact-storage-failed", JSObject().put("recoverable", true))
    }
  }

  private fun requireRunId(call: PluginCall): String {
    val runId = call.getString("runId")
      ?: throw IllegalArgumentException("runId is required.")
    if (runId.isBlank()) {
      throw IllegalArgumentException("runId is required.")
    }
    return UUID.fromString(runId).toString()
  }

  private fun markFailed(runId: String, stage: InterpretationRunStage, code: String) {
    try {
      artifactStore.markFailed(runId, stage, code)
    } catch (_: InterpretationArtifactStorageException) {
      return
    }
  }

  private fun storeInterpretationFailure(
    runId: String,
    requestJson: String,
    failure: InterpretationFailureArtifact,
    attempts: List<dev.solidcoder.interpretation.application.FieldInterpretationAttempt>,
  ) {
    try {
      artifactStore.storeInterpretationFailure(
        runId = runId,
        requestJson = requestJson,
        failure = failure,
        attempts = attempts,
      )
    } catch (_: InterpretationArtifactStorageException) {
      return
    }
  }

  private fun storeCancellationInterpretation(
    runId: String,
    requestJson: String,
    exception: InterpretationCancellationException?,
  ) {
    val failure = InterpretationFailureArtifact(
      code = InterpretationFailureCode.CANCELLED.toExternalCode(),
      failureCode = InterpretationFailureCode.CANCELLED.toExternalCode(),
      recoverable = true,
      exceptionType = exception?.javaClass?.simpleName ?: "CancellationException",
      phase = StructuredGenerationFailurePhase.GENERATION.name.lowercase(),
      safeMessage = exception?.message ?: "Interpretation was cancelled.",
      runtime = InterpretationRuntimeMetadata(
        modelId = compositionRoot.modelConfiguration.modelId,
        modelVersion = compositionRoot.modelConfiguration.modelVersion,
        backend = "gpu",
      ),
    )
    storeInterpretationFailure(
      runId = runId,
      requestJson = requestJson,
      failure = failure,
      attempts = exception?.attempts ?: emptyList(),
    )
  }

  private fun interpretationFailureArtifact(exception: InterpretationExecutionException): InterpretationFailureArtifact {
    return InterpretationFailureArtifact(
      code = exception.failureCode.toExternalCode(),
      failureCode = exception.failureCode.toExternalCode(),
      recoverable = exception.recoverable,
      exceptionType = exception::class.java.simpleName,
      phase = exception.phase.name.lowercase(),
      safeMessage = exception.safePublicMessage,
      runtime = InterpretationRuntimeMetadata(
        modelId = compositionRoot.modelConfiguration.modelId,
        modelVersion = compositionRoot.modelConfiguration.modelVersion,
        backend = "gpu",
      ),
      fieldKey = exception.diagnostics?.fieldKey?.value,
      fieldIndex = exception.diagnostics?.fieldIndex,
      fieldCount = exception.diagnostics?.fieldCount,
      durationMs = exception.diagnostics?.durationMs,
      outputLength = exception.diagnostics?.outputLength,
      completedFieldKeys = exception.diagnostics?.completedFieldKeys?.map { it.value } ?: emptyList(),
      failedFieldKey = exception.diagnostics?.failedFieldKey?.value,
    )
  }

  private data class ActiveInterpretationOperation(
    val requestId: String,
    val runId: String,
    val requestJson: String,
    val call: PluginCall,
  ) {
    val cancelRequested = AtomicBoolean(false)
    val completion = CountDownLatch(1)
    val originalResponseCompleted = AtomicBoolean(false)
    val future = AtomicReference<Future<*>?>(null)
  }

  companion object {
    private const val CANCELLATION_TIMEOUT_SECONDS = 10L
  }
}

private fun InterpretationFailureCode.toExternalCode(): String = when (this) {
  InterpretationFailureCode.MODEL_UNAVAILABLE -> "model_unavailable"
  InterpretationFailureCode.MODEL_CORRUPT -> "model_corrupt"
  InterpretationFailureCode.UNSUPPORTED_DEVICE -> "unsupported_device"
  InterpretationFailureCode.INFERENCE_FAILED -> "inference_failed"
  InterpretationFailureCode.MALFORMED_OUTPUT -> "malformed_output"
  InterpretationFailureCode.CANCELLED -> "cancelled"
  InterpretationFailureCode.INVALID_REQUEST -> "invalid_request"
}
