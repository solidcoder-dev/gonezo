package com.gonezo.multiplatform.plugins.interpretation.runtime

import com.gonezo.multiplatform.plugins.interpretation.model.InterpretationModelConfiguration
import com.gonezo.multiplatform.plugins.interpretation.model.InterpretationModelStore
import com.google.ai.edge.litertlm.Backend
import com.google.ai.edge.litertlm.ConversationConfig
import com.google.ai.edge.litertlm.Engine
import com.google.ai.edge.litertlm.EngineConfig
import com.google.ai.edge.litertlm.SamplerConfig
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.StructuredGenerationException
import dev.solidcoder.interpretation.application.StructuredGenerationFailurePhase
import dev.solidcoder.interpretation.application.StructuredGenerationRequest
import dev.solidcoder.interpretation.application.StructuredGenerationResult
import dev.solidcoder.interpretation.application.StructuredGenerationRuntime
import dev.solidcoder.interpretation.application.StructuredGenerationTimeoutException
import dev.solidcoder.interpretation.application.StructuredGenerationTimeoutKind
import java.io.Closeable
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeout

internal interface LiteRtEngineHandle : AutoCloseable {
  suspend fun initialize()
  fun createConversation(configuration: ConversationConfig): LiteRtConversationHandle
}

internal interface LiteRtConversationHandle : AutoCloseable {
  fun sendMessageStream(prompt: String): Flow<String>
  fun cancelProcess()
}

internal const val DEFAULT_MAX_NUM_TOKENS = 1_024

internal data class LiteRtEngineConfiguration(
  val modelPath: String,
  val cacheDirectoryPath: String,
  val maxNumTokens: Int = DEFAULT_MAX_NUM_TOKENS,
)

internal fun interface LiteRtEngineFactory {
  fun create(configuration: LiteRtEngineConfiguration): LiteRtEngineHandle
}

internal class LiteRtStructuredGenerationRuntime(
  private val modelStore: InterpretationModelStore,
  private val engineFactory: LiteRtEngineFactory,
  private val modelConfiguration: InterpretationModelConfiguration,
  private val cacheDirectoryPath: String,
  private val logger: InterpretationRuntimeLogger = NoOpInterpretationRuntimeLogger,
  private val elapsedRealtimeProvider: ElapsedRealtimeProvider = NoOpElapsedRealtimeProvider,
  private val initializationTimeoutMs: Long = ENGINE_INITIALIZATION_TIMEOUT_MS,
  private val generationTimeoutMs: Long = GENERATION_TIMEOUT_MS,
) : StructuredGenerationRuntime, Closeable {
  private val engineMutex = Mutex()
  private val generationMutex = Mutex()

  @Volatile
  private var closed = false

  private var engine: LiteRtEngineHandle? = null

  override suspend fun generate(request: StructuredGenerationRequest): StructuredGenerationResult {
    require(request.prompt.isNotBlank()) { "structured generation prompt is required" }
    ensureOpen()

    return generationMutex.withLock {
      ensureOpen()
      val handle = engine()
      val output = generate(handle, request)
      if (output.isBlank()) {
        throw StructuredGenerationException(
          failureCode = InterpretationFailureCode.INFERENCE_FAILED,
          recoverable = true,
          phase = StructuredGenerationFailurePhase.GENERATION,
          message = "The model returned an empty response.",
        )
      }
      StructuredGenerationResult(output)
    }
  }

  override fun close() {
    if (closed) {
      return
    }
    closed = true
    val handle = synchronized(this) {
      val current = engine
      engine = null
      current
    }
    handle?.close()
  }

  private suspend fun engine(): LiteRtEngineHandle {
    engine?.let { return it }
    return engineMutex.withLock {
      engine?.let { return it }

      logEvent(
        event = "interpretation.model.resolve.start",
        modelId = modelConfiguration.modelId,
        modelVersion = modelConfiguration.modelVersion,
      )
      val resolveStartedAt = elapsedRealtimeProvider.now()
      val modelPath = resolveModelPath()
      logEvent(
        event = "interpretation.model.resolve.success",
        modelId = modelConfiguration.modelId,
        modelVersion = modelConfiguration.modelVersion,
        durationMs = elapsedRealtimeProvider.now() - resolveStartedAt,
      )

      val created = engineFactory.create(
        LiteRtEngineConfiguration(
          modelPath = modelPath,
          cacheDirectoryPath = cacheDirectoryPath,
          maxNumTokens = MAX_NUM_TOKENS,
        ),
      )

      try {
      logEvent(
        event = "interpretation.engine.initialize.start",
        modelId = modelConfiguration.modelId,
        modelVersion = modelConfiguration.modelVersion,
      )
        val initializeStartedAt = elapsedRealtimeProvider.now()
        withTimeout(initializationTimeoutMs) {
          created.initialize()
        }
      logEvent(
        event = "interpretation.engine.initialize.success",
        modelId = modelConfiguration.modelId,
        modelVersion = modelConfiguration.modelVersion,
        durationMs = elapsedRealtimeProvider.now() - initializeStartedAt,
      )
      } catch (exception: StructuredGenerationException) {
        created.close()
        throw exception
      } catch (exception: TimeoutCancellationException) {
        created.close()
        logFailure(
          code = InterpretationFailureCode.INFERENCE_FAILED,
          phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
          exception = exception,
        )
        throw StructuredGenerationException(
          failureCode = InterpretationFailureCode.INFERENCE_FAILED,
          recoverable = true,
          phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
          message = "The local model runtime timed out while initializing.",
          cause = exception,
        )
      } catch (exception: CancellationException) {
        created.close()
        throw exception
      } catch (exception: IllegalStateException) {
        created.close()
        logFailure(
          code = InterpretationFailureCode.UNSUPPORTED_DEVICE,
          phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
          exception = exception,
        )
        throw StructuredGenerationException(
          failureCode = InterpretationFailureCode.UNSUPPORTED_DEVICE,
          recoverable = false,
          phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
          message = "The device cannot initialize the local model runtime.",
          cause = exception,
        )
      } catch (exception: LinkageError) {
        created.close()
        logFailure(
          code = InterpretationFailureCode.UNSUPPORTED_DEVICE,
          phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
          exception = exception,
        )
        throw StructuredGenerationException(
          failureCode = InterpretationFailureCode.UNSUPPORTED_DEVICE,
          recoverable = false,
          phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
          message = "The device cannot initialize the local model runtime.",
          cause = exception,
        )
      } catch (exception: RuntimeException) {
        created.close()
        logFailure(
          code = InterpretationFailureCode.INFERENCE_FAILED,
          phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
          exception = exception,
        )
        throw StructuredGenerationException(
          failureCode = InterpretationFailureCode.INFERENCE_FAILED,
          recoverable = true,
          phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
          message = "The local model runtime could not be initialized.",
          cause = exception,
        )
      }

      engine = created
      created
    }
  }

  private fun resolveModelPath(): String {
    return try {
      modelStore.resolveModelPath()
    } catch (exception: StructuredGenerationException) {
      throw exception
    } catch (exception: RuntimeException) {
      logFailure(
        code = InterpretationFailureCode.MODEL_UNAVAILABLE,
        phase = StructuredGenerationFailurePhase.MODEL_RESOLUTION,
        exception = exception,
      )
      throw StructuredGenerationException(
        failureCode = InterpretationFailureCode.MODEL_UNAVAILABLE,
        recoverable = true,
        phase = StructuredGenerationFailurePhase.MODEL_RESOLUTION,
        message = "The interpretation model could not be resolved.",
        cause = exception,
      )
    }
  }

  private suspend fun generate(handle: LiteRtEngineHandle, request: StructuredGenerationRequest): String {
    val prompt = request.prompt
    val conversationConfig = ConversationConfig(
      samplerConfig = SamplerConfig(
        topK = 1,
        topP = 1.0,
        temperature = 0.0,
        seed = 0,
      ),
      automaticToolCalling = false,
      channels = emptyList(),
    )
    val effectiveTimeoutMs = minOf(
      generationTimeoutMs,
      request.generationTimeoutMs ?: generationTimeoutMs,
    )
    val conversation = handle.createConversation(conversationConfig)
    var closed = false
    fun closeConversation() {
      if (closed) {
        return
      }
      closed = true
      conversation.close()
      logEvent(
        event = "interpretation.generation.conversation_closed",
        request = request,
      )
    }

    try {
      logEvent(
        event = "interpretation.generation.start",
        request = request,
      )
      val startedAt = elapsedRealtimeProvider.now()
      return withTimeout(effectiveTimeoutMs) {
        val output = StringBuilder()
        var firstChunkLogged = false
        conversation.sendMessageStream(prompt).collect { chunk ->
          if (!firstChunkLogged) {
            firstChunkLogged = true
            logEvent(
              event = "interpretation.generation.first_chunk",
              request = request,
            )
          }
          output.append(chunk)
        }
        val rawOutput = output.toString()
        logEvent(
          event = "interpretation.generation.success",
          request = request,
          durationMs = elapsedRealtimeProvider.now() - startedAt,
          outputLength = rawOutput.length,
        )
        rawOutput
      }
    } catch (exception: TimeoutCancellationException) {
      val configuredGenerationTimeoutMs = generationTimeoutMs
      val requestedGenerationTimeoutMs = request.generationTimeoutMs
      val timeoutKind = if (requestedGenerationTimeoutMs != null && requestedGenerationTimeoutMs < configuredGenerationTimeoutMs) {
        StructuredGenerationTimeoutKind.GLOBAL_BUDGET
      } else {
        StructuredGenerationTimeoutKind.INDIVIDUAL
      }
      runCatching {
        conversation.cancelProcess()
      }
      logEvent(
        event = "interpretation.generation.cancel_requested",
        request = request,
      )
      logEvent(
        event = "interpretation.generation.timeout",
        request = request,
      )
      logFailure(
        code = InterpretationFailureCode.INFERENCE_FAILED,
        phase = StructuredGenerationFailurePhase.GENERATION,
        exception = exception,
      )
      throw StructuredGenerationTimeoutException(
        timeoutKind = timeoutKind,
        message = "The local model timed out while generating a response.",
        cause = exception,
      )
    } catch (exception: CancellationException) {
      runCatching { conversation.cancelProcess() }
      logEvent(
        event = "interpretation.generation.cancel_requested",
        request = request,
      )
      throw exception
    } catch (exception: RuntimeException) {
      logFailure(
        code = InterpretationFailureCode.INFERENCE_FAILED,
        phase = StructuredGenerationFailurePhase.GENERATION,
        exception = exception,
      )
      throw StructuredGenerationException(
        failureCode = InterpretationFailureCode.INFERENCE_FAILED,
        recoverable = true,
        phase = StructuredGenerationFailurePhase.GENERATION,
        message = "The local model runtime could not generate a response.",
        cause = exception,
      )
    } finally {
      closeConversation()
    }
  }

  private fun ensureOpen() {
    check(!closed) { "LiteRtStructuredGenerationRuntime is closed." }
  }

  private fun logEvent(
    event: String,
    modelId: String,
    modelVersion: String,
    durationMs: Long? = null,
    outputLength: Int? = null,
  ) {
    logger.log(
      TAG,
      buildString {
        append(event)
        append(' ')
        append("modelId=").append(modelId)
        append(' ')
        append("modelVersion=").append(modelVersion)
        append(' ')
        append("backend=").append(BACKEND_NAME)
        durationMs?.let { append(' ').append("durationMs=").append(it) }
        outputLength?.let { append(' ').append("outputLength=").append(it) }
      },
    )
  }

  private fun logEvent(
    event: String,
    request: StructuredGenerationRequest,
    durationMs: Long? = null,
    outputLength: Int? = null,
  ) {
    logger.log(
      TAG,
      buildString {
        append(event)
        append(' ')
        append("modelId=").append(modelConfiguration.modelId)
        append(' ')
        append("modelVersion=").append(modelConfiguration.modelVersion)
        append(' ')
        append("backend=").append(BACKEND_NAME)
        request.fieldKey?.let { append(' ').append("fieldKey=").append(it) }
        request.fieldIndex?.let { append(' ').append("fieldIndex=").append(it) }
        request.attemptNumber?.let { append(' ').append("attemptNumber=").append(it) }
        append(' ').append("promptVariant=").append(request.promptVariant.name.lowercase())
        durationMs?.let { append(' ').append("durationMs=").append(it) }
        outputLength?.let { append(' ').append("outputLength=").append(it) }
      },
    )
  }

  private fun logFailure(
    code: InterpretationFailureCode,
    phase: StructuredGenerationFailurePhase,
    exception: Throwable,
  ) {
    logger.log(
      TAG,
      buildString {
        append("interpretation.failure ")
        append("modelId=").append(modelConfiguration.modelId)
        append(' ')
        append("modelVersion=").append(modelConfiguration.modelVersion)
        append(' ')
        append("backend=").append(BACKEND_NAME)
        append(' ')
        append("phase=").append(phase.name.lowercase())
        append(' ')
        append("failureCode=").append(code.name.lowercase())
        append(' ')
        append("exception=").append(exception::class.java.simpleName)
      },
    )
  }

  companion object {
    private const val TAG = "GonezoInterpretation"
    private const val BACKEND_NAME = "GPU"
    internal const val MAX_NUM_TOKENS = 1_024
    internal const val ENGINE_INITIALIZATION_TIMEOUT_MS = 90_000L
    internal const val GENERATION_TIMEOUT_MS = 15_000L
  }
}

internal fun interface InterpretationRuntimeLogger {
  fun log(tag: String, message: String)
}

internal object NoOpInterpretationRuntimeLogger : InterpretationRuntimeLogger {
  override fun log(tag: String, message: String) = Unit
}

internal object AndroidInterpretationRuntimeLogger : InterpretationRuntimeLogger {
  override fun log(tag: String, message: String) {
    android.util.Log.d(tag, message)
  }
}

internal fun interface ElapsedRealtimeProvider {
  fun now(): Long
}

internal object NoOpElapsedRealtimeProvider : ElapsedRealtimeProvider {
  override fun now(): Long = 0L
}

internal object AndroidElapsedRealtimeProvider : ElapsedRealtimeProvider {
  override fun now(): Long = android.os.SystemClock.elapsedRealtime()
}

internal fun liteRtEngineFactory(): LiteRtEngineFactory = LiteRtEngineFactory { configuration ->
  object : LiteRtEngineHandle {
    private val engine = Engine(
      EngineConfig(
        modelPath = configuration.modelPath,
        backend = Backend.GPU(),
        maxNumTokens = configuration.maxNumTokens,
        cacheDir = configuration.cacheDirectoryPath,
      ),
    )

    override suspend fun initialize() {
      engine.initialize()
    }

    override fun createConversation(configuration: ConversationConfig): LiteRtConversationHandle = object : LiteRtConversationHandle {
      private val conversation = engine.createConversation(configuration)
      @Volatile
      private var closed = false

      override fun sendMessageStream(prompt: String): Flow<String> =
        conversation.sendMessageAsync(prompt)
          .let { flow ->
            kotlinx.coroutines.flow.flow {
              flow.collect { message -> emit(message.toString()) }
            }
          }

      override fun cancelProcess() {
        conversation.cancelProcess()
      }

      override fun close() {
        if (closed) {
          return
        }
        closed = true
        conversation.close()
      }
    }

    override fun close() {
      engine.close()
    }
  }
}
