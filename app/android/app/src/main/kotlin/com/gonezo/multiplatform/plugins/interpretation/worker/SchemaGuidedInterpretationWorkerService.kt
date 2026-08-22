package com.gonezo.multiplatform.plugins.interpretation.worker

import android.app.Service
import android.content.Intent
import android.os.Handler
import android.os.HandlerThread
import android.os.IBinder
import android.os.Message
import android.os.Messenger
import com.gonezo.multiplatform.infrastructure.configuration.AndroidProcessingConfigurationReader
import com.gonezo.multiplatform.infrastructure.processing.factory.ProcessingAssembly
import com.gonezo.multiplatform.infrastructure.processing.factory.ProcessingFactory
import com.gonezo.multiplatform.infrastructure.processing.isolation.InterpretationModelConfigurationCodec
import com.gonezo.multiplatform.infrastructure.processing.isolation.StructuredGenerationRequestCodec
import com.gonezo.multiplatform.infrastructure.processing.isolation.StructuredGenerationWorkerProtocol
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationException
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationFailurePhase
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRuntime
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class SchemaGuidedInterpretationWorkerService : Service() {
  private lateinit var handlerThread: HandlerThread
  private lateinit var processing: WorkerProcessingOwner
  private lateinit var serviceMessenger: Messenger
  private lateinit var workerScope: CoroutineScope
  private val activeRequests = ConcurrentHashMap<String, Job>()

  override fun onCreate() {
    super.onCreate()
    workerScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    handlerThread = HandlerThread("GonezoInterpretationWorkerCommands").also { it.start() }
    serviceMessenger = Messenger(Handler(handlerThread.looper, ::handleMessage))
  }

  override fun onBind(intent: Intent): IBinder {
    if (::processing.isInitialized) return serviceMessenger.binder
    val modelConfiguration = intent.getStringExtra(StructuredGenerationWorkerProtocol.KEY_MODEL_CONFIGURATION)
      ?.let(InterpretationModelConfigurationCodec::decode)
      ?: error("Interpretation worker model configuration is missing.")
    val processingConfiguration = AndroidProcessingConfigurationReader().read()
    val createdAssembly = ProcessingFactory(
      context = applicationContext,
      configuration = processingConfiguration,
      promptCompiler = dev.solidcoder.interpretation.json.JsonFieldInterpretationPromptCompiler(),
      resultDecoder = dev.solidcoder.interpretation.json.JsonFieldInterpretationResultDecoder(),
      fieldProcessingOrder = com.gonezo.multiplatform.plugins.interpretation.bootstrap.GonezoFieldProcessingOrder,
      modelConfigurationOverride = modelConfiguration,
    ).create()
    processing = WorkerProcessingOwner(createdAssembly)
    return serviceMessenger.binder
  }

  override fun onDestroy() {
    workerScope.cancel()
    activeRequests.values.forEach { it.cancel() }
    activeRequests.clear()
    if (::processing.isInitialized) processing.close()
    if (::handlerThread.isInitialized) handlerThread.quitSafely()
    super.onDestroy()
  }

  private fun handleMessage(message: Message): Boolean {
    val data = message.data
    val action = data.getString(StructuredGenerationWorkerProtocol.KEY_ACTION) ?: return true
    val requestId = data.getString(StructuredGenerationWorkerProtocol.KEY_REQUEST_ID)
    when (action) {
      StructuredGenerationWorkerProtocol.ACTION_PREPARE,
      StructuredGenerationWorkerProtocol.ACTION_GENERATE -> {
        if (requestId == null || message.replyTo == null) return true
        val job = workerScope.launch {
          try {
            if (action == StructuredGenerationWorkerProtocol.ACTION_PREPARE) {
              processing.prepare()
              sendSuccess(message.replyTo, requestId)
            } else {
              val request = StructuredGenerationRequestCodec.decode(
                requireNotNull(data.getBundle(StructuredGenerationWorkerProtocol.KEY_REQUEST)),
              )
              val result = processing.generate(request)
              sendSuccess(message.replyTo, requestId, result.output)
            }
          } catch (_: CancellationException) {
          } catch (exception: StructuredGenerationException) {
            sendFailure(message.replyTo, requestId, exception)
          } catch (exception: RuntimeException) {
            sendFailure(
              message.replyTo,
              requestId,
              StructuredGenerationException(
                failureCode = dev.solidcoder.interpretation.application.InterpretationFailureCode.INFERENCE_FAILED,
                recoverable = true,
                phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
                message = "Interpretation worker failed.",
                cause = exception,
              ),
            )
          } finally {
            activeRequests.remove(requestId)
          }
        }
        activeRequests[requestId] = job
        if (job.isCompleted) activeRequests.remove(requestId, job)
      }

      StructuredGenerationWorkerProtocol.ACTION_CANCEL -> {
        requestId?.let { activeRequests.remove(it)?.cancel() }
      }

      StructuredGenerationWorkerProtocol.ACTION_CLOSE -> stopSelf()
    }
    return true
  }

  private fun sendSuccess(replyTo: Messenger, requestId: String, output: String? = null) {
    send(replyTo, requestId, BundleBuilder.success(output))
  }

  private fun sendFailure(replyTo: Messenger, requestId: String, exception: StructuredGenerationException) {
    send(replyTo, requestId, BundleBuilder.failure(exception))
  }

  private fun send(replyTo: Messenger, requestId: String, data: android.os.Bundle) {
    data.putString(StructuredGenerationWorkerProtocol.KEY_REQUEST_ID, requestId)
    runCatching { replyTo.send(Message.obtain().apply { this.data = data }) }
  }

  private object BundleBuilder {
    fun success(output: String?): android.os.Bundle = android.os.Bundle().apply {
      putBoolean(StructuredGenerationWorkerProtocol.KEY_SUCCESS, true)
      output?.let { putString(StructuredGenerationWorkerProtocol.KEY_OUTPUT, it) }
    }

    fun failure(exception: StructuredGenerationException): android.os.Bundle = android.os.Bundle().apply {
      putBoolean(StructuredGenerationWorkerProtocol.KEY_SUCCESS, false)
      putString(StructuredGenerationWorkerProtocol.KEY_ERROR_CODE, exception.failureCode.name)
      putBoolean(StructuredGenerationWorkerProtocol.KEY_ERROR_RECOVERABLE, exception.recoverable)
      exception.phase?.let { putString(StructuredGenerationWorkerProtocol.KEY_ERROR_PHASE, it.name) }
      putString(StructuredGenerationWorkerProtocol.KEY_ERROR_MESSAGE, exception.message)
    }
  }
}

internal class WorkerProcessingOwner(
  private val assembly: ProcessingAssembly,
) : AutoCloseable {
  private val preparer = assembly.runtime as? com.gonezo.multiplatform.infrastructure.processing.preparation.ProcessingPreparer
    ?: error("Interpretation runtime does not support preparation.")

  val runtime: StructuredGenerationRuntime
    get() = assembly.runtime

  suspend fun prepare() {
    preparer.prepare()
  }

  suspend fun generate(request: dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRequest) =
    assembly.runtime.generate(request)

  override fun close() {
    assembly.close()
  }
}
