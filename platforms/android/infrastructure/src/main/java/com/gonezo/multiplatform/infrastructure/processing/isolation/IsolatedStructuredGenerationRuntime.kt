package com.gonezo.multiplatform.infrastructure.processing.isolation

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.Message
import android.os.Messenger
import android.os.RemoteException
import android.util.Log
import com.gonezo.multiplatform.infrastructure.processing.preparation.ProcessingPreparer
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationException
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationFailurePhase
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRequest
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationResult
import java.io.Closeable
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeout
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

internal class IsolatedStructuredGenerationRuntime(
  private val context: Context,
  private val workerIntent: Intent,
  modelConfiguration: com.gonezo.multiplatform.infrastructure.processing.litert.model.InterpretationModelConfiguration,
) : dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRuntime, ProcessingPreparer, Closeable {
  init {
    workerIntent.putExtra(
      StructuredGenerationWorkerProtocol.KEY_MODEL_CONFIGURATION,
      InterpretationModelConfigurationCodec.encode(modelConfiguration),
    )
  }
  private val mainHandler = Handler(Looper.getMainLooper())
  private val connectionLock = Any()
  private val pendingRequests = ConcurrentHashMap<String, PendingRequest>()
  private val pendingSends = mutableListOf<(Messenger) -> Unit>()
  private val closed = AtomicBoolean(false)
  private var serviceMessenger: Messenger? = null
  private var connection: ServiceConnection? = null
  private val clientMessenger = Messenger(Handler(Looper.getMainLooper()) { message ->
    handleReply(message)
    true
  })

  override suspend fun prepare() {
    ensureOpen()
    request(StructuredGenerationWorkerProtocol.ACTION_PREPARE)
  }

  override suspend fun generate(request: StructuredGenerationRequest): StructuredGenerationResult {
    ensureOpen()
    val reply = request(
      action = StructuredGenerationWorkerProtocol.ACTION_GENERATE,
      payload = StructuredGenerationRequestCodec.encode(request),
    )
    return StructuredGenerationResult(requireNotNull(reply.getString(StructuredGenerationWorkerProtocol.KEY_OUTPUT)))
  }

  override fun close() {
    if (!closed.compareAndSet(false, true)) return
    failPending(CancellationException("Interpretation worker was closed."))
    synchronized(connectionLock) {
      pendingSends.clear()
      connection?.let { context.unbindService(it) }
      connection = null
      serviceMessenger = null
    }
  }

  private suspend fun request(action: String, payload: Bundle = Bundle()): Bundle {
    val requestId = UUID.randomUUID().toString()
    return withTimeout(REQUEST_TIMEOUT_MS) {
      suspendCancellableCoroutine { continuation ->
        val pending = PendingRequest(requestId, continuation)
        pendingRequests[requestId] = pending
        continuation.invokeOnCancellation {
          pendingRequests.remove(requestId, pending)
          sendCancel(requestId)
        }
        mainHandler.post {
          sendRequest(action, requestId, payload, pending)
        }
      }
    }
  }

  private fun sendRequest(action: String, requestId: String, payload: Bundle, pending: PendingRequest) {
    if (closed.get()) {
      completeFailure(pending, CancellationException("Interpretation worker was closed."))
      return
    }
    ensureBound { messenger ->
      if (!pendingRequests.containsKey(requestId)) return@ensureBound
      val message = Message.obtain().apply {
        data = Bundle().apply {
          putString(StructuredGenerationWorkerProtocol.KEY_ACTION, action)
          putString(StructuredGenerationWorkerProtocol.KEY_REQUEST_ID, requestId)
          putBundle(StructuredGenerationWorkerProtocol.KEY_REQUEST, payload)
        }
        replyTo = clientMessenger
      }
      try {
        messenger.send(message)
      } catch (exception: RemoteException) {
        completeFailure(pending, workerUnavailable(exception))
      }
    }
  }

  private fun ensureBound(onReady: (Messenger) -> Unit) {
    var callbacks: List<(Messenger) -> Unit> = emptyList()
    var connectedMessenger: Messenger? = null
    synchronized(connectionLock) {
      serviceMessenger?.let {
        onReady(it)
        return
      }
      pendingSends += onReady
      val existingConnection = connection
      if (existingConnection == null) {
        val newConnection = object : ServiceConnection {
          override fun onServiceConnected(name: ComponentName, service: android.os.IBinder) {
            val readyCallbacks: List<(Messenger) -> Unit>
            synchronized(connectionLock) {
              serviceMessenger = Messenger(service)
              readyCallbacks = pendingSends.toList()
              pendingSends.clear()
            }
            readyCallbacks.forEach { it(Messenger(service)) }
          }

          override fun onServiceDisconnected(name: ComponentName) {
            synchronized(connectionLock) {
              serviceMessenger = null
              connection = null
              pendingSends.clear()
            }
            failPending(workerUnavailable(null))
          }

          override fun onBindingDied(name: ComponentName) {
            synchronized(connectionLock) {
              serviceMessenger = null
              connection = null
              pendingSends.clear()
            }
            failPending(workerUnavailable(null))
          }
        }
        connection = newConnection
        if (!context.bindService(workerIntent, newConnection, Context.BIND_AUTO_CREATE)) {
          connection = null
          failPending(workerUnavailable(null))
          return
        }
      }
      connectedMessenger = serviceMessenger
      if (connectedMessenger != null) {
        pendingSends.remove(onReady)
        callbacks = listOf(onReady)
      }
    }
    connectedMessenger?.let { callbacks.forEach { callback -> callback(it) } }
  }

  private fun handleReply(message: Message) {
    val requestId = message.data.getString(StructuredGenerationWorkerProtocol.KEY_REQUEST_ID) ?: return
    val pending = pendingRequests.remove(requestId) ?: return
    val data = message.data
    if (data.getBoolean(StructuredGenerationWorkerProtocol.KEY_SUCCESS)) {
      pending.continuation.resume(data)
    } else {
      pending.continuation.resumeWithException(workerException(data))
    }
  }

  private fun sendCancel(requestId: String) {
    val messenger = synchronized(connectionLock) { serviceMessenger } ?: return
    runCatching {
      messenger.send(Message.obtain().apply {
        data = Bundle().apply {
          putString(StructuredGenerationWorkerProtocol.KEY_ACTION, StructuredGenerationWorkerProtocol.ACTION_CANCEL)
          putString(StructuredGenerationWorkerProtocol.KEY_REQUEST_ID, requestId)
        }
      })
    }
  }

  private fun failPending(exception: Throwable) {
    synchronized(connectionLock) { pendingSends.clear() }
    pendingRequests.values.toList().forEach { pending ->
      if (pendingRequests.remove(pending.requestId, pending)) completeFailure(pending, exception)
    }
  }

  private fun completeFailure(pending: PendingRequest, exception: Throwable) {
    pendingRequests.remove(pending.requestId, pending)
    if (pending.continuation.isActive) pending.continuation.resumeWithException(exception)
  }

  private fun workerException(data: Bundle) = StructuredGenerationException(
    failureCode = data.getString(StructuredGenerationWorkerProtocol.KEY_ERROR_CODE)
      ?.let { runCatching { InterpretationFailureCode.valueOf(it) }.getOrNull() }
      ?: InterpretationFailureCode.INFERENCE_FAILED,
    recoverable = data.getBoolean(StructuredGenerationWorkerProtocol.KEY_ERROR_RECOVERABLE, true),
    phase = data.getString(StructuredGenerationWorkerProtocol.KEY_ERROR_PHASE)
      ?.let { runCatching { StructuredGenerationFailurePhase.valueOf(it) }.getOrNull() },
    message = data.getString(StructuredGenerationWorkerProtocol.KEY_ERROR_MESSAGE) ?: "Interpretation worker failed.",
  )

  private fun workerUnavailable(cause: Throwable?) = StructuredGenerationException(
    failureCode = InterpretationFailureCode.INFERENCE_FAILED,
    recoverable = true,
    phase = StructuredGenerationFailurePhase.ENGINE_INITIALIZATION,
    message = "Interpretation worker is unavailable.",
    cause = cause,
  ).also { Log.e(TAG, it.message, cause) }

  private fun ensureOpen() {
    check(!closed.get()) { "Interpretation worker runtime is closed." }
  }

  private data class PendingRequest(val requestId: String, val continuation: CancellableContinuation<Bundle>)

  companion object {
    private const val REQUEST_TIMEOUT_MS = 120_000L
    private const val TAG = "GonezoInterpretation"
  }
}
