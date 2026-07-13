package com.gonezo.multiplatform.plugins.interpretation.runtime

import com.gonezo.multiplatform.plugins.interpretation.model.InterpretationModelConfiguration
import com.gonezo.multiplatform.plugins.interpretation.model.InterpretationModelStore
import com.google.ai.edge.litertlm.ConversationConfig
import dev.solidcoder.interpretation.application.InterpretationFailureCode
import dev.solidcoder.interpretation.application.StructuredGenerationException
import dev.solidcoder.interpretation.application.StructuredGenerationRequest
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlin.io.path.readText
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.ArrayDeque
import java.util.concurrent.atomic.AtomicInteger

class LiteRtStructuredGenerationRuntimeTest {
  @Test
  fun `initializes lazily and reuses the engine for subsequent requests`() {
    runBlocking {
      val engine = FakeLiteRtEngine()
      val runtime = newRuntime(engine)

      assertEquals(0, engine.initializeCalls.get())

      val first = runtime.generate(request("prompt-1"))
      val second = runtime.generate(request("prompt-2"))

      assertEquals("""{"ok":true}""", first.output)
      assertEquals("""{"ok":true}""", second.output)
      assertEquals(1, engine.initializeCalls.get())
      assertEquals(2, engine.createConversationCalls.get())
      assertEquals(2, engine.conversationConfigurations.size)
      engine.conversationConfigurations.forEach { configuration ->
        val samplerConfig = requireNotNull(configuration.samplerConfig)
        assertEquals(1, samplerConfig.topK)
        assertEquals(1.0, samplerConfig.topP, 0.0)
        assertEquals(0.0, samplerConfig.temperature, 0.0)
        assertEquals(0, samplerConfig.seed)
        assertFalse(configuration.automaticToolCalling)
        assertTrue(configuration.channels?.isEmpty() == true)
      }
    }
  }

  @Test
  fun `creates a new conversation for each request and does not leak history`() {
    runBlocking {
      val engine = FakeLiteRtEngine()
      val runtime = newRuntime(engine)

      runtime.generate(request("prompt-1"))
      runtime.generate(request("prompt-2"))

      assertEquals(2, engine.conversations.size)
      assertEquals(listOf("prompt-1"), engine.conversations[0].prompts)
      assertEquals(listOf("prompt-2"), engine.conversations[1].prompts)
    }
  }

  @Test
  fun `uses the provided engine configuration including the writable cache directory`() {
    runBlocking {
      val engine = FakeLiteRtEngine()
      val factory = FakeLiteRtEngineFactory(engine)
      val runtime = LiteRtStructuredGenerationRuntime(
        modelStore = FakeModelStore("/tmp/model.litertlm"),
        engineFactory = factory,
        modelConfiguration = modelConfiguration(),
        cacheDirectoryPath = "/tmp/gonezo-cache",
      )

      runtime.generate(request("prompt"))

      assertEquals(1, factory.configurations.size)
      assertEquals("/tmp/model.litertlm", factory.configurations.single().modelPath)
      assertEquals("/tmp/gonezo-cache", factory.configurations.single().cacheDirectoryPath)
      assertEquals(LiteRtStructuredGenerationRuntime.MAX_NUM_TOKENS, factory.configurations.single().maxNumTokens)
      assertEquals(1, engine.initializeCalls.get())
    }
  }

  @Test
  fun `serializes concurrent generations when the sdk does not guarantee concurrency safety`() {
    runBlocking {
      val firstStarted = CompletableDeferred<Unit>()
      val allowFirstToComplete = CompletableDeferred<Unit>()
      val conversationIndex = AtomicInteger(0)
      val engine = FakeLiteRtEngine(
        onConversationCreated = { conversation ->
          if (conversationIndex.incrementAndGet() == 1) {
            conversation.onGenerate = {
              firstStarted.complete(Unit)
              allowFirstToComplete.await()
              listOf("A", "B")
            }
          } else {
            conversation.onGenerate = { listOf("C") }
          }
        },
      )
      val runtime = newRuntime(engine)

      coroutineScope {
        val first = async { runtime.generate(request("first")) }
        firstStarted.await()
        val second = async { runtime.generate(request("second")) }
        kotlinx.coroutines.delay(50)

        assertFalse(second.isCompleted)
        allowFirstToComplete.complete(Unit)

        assertEquals("AB", first.await().output)
        assertEquals("C", second.await().output)
      }
    }
  }

  @Test
  fun `concatenates streaming fragments in order`() {
    runBlocking {
      val engine = FakeLiteRtEngine(
        onConversationCreated = { conversation ->
          conversation.onGenerate = { listOf("first", "second", "third") }
        },
      )
      val runtime = newRuntime(engine)

      val result = runtime.generate(request("prompt"))

      assertEquals("firstsecondthird", result.output)
    }
  }

  @Test
  fun `rejects empty outputs as inference failures`() {
    runBlocking {
      val engine = FakeLiteRtEngine(
        onConversationCreated = { conversation ->
          conversation.onGenerate = { listOf("   ") }
        },
      )
      val runtime = newRuntime(engine)

      val exception = assertThrows(StructuredGenerationException::class.java) {
        runBlocking {
          runtime.generate(request("prompt"))
        }
      }
      assertEquals(InterpretationFailureCode.INFERENCE_FAILED, exception.failureCode)
    }
  }

  @Test
  fun `times out initialization and allows retry with a fresh engine`() {
    runBlocking {
      val firstEngine = FakeLiteRtEngine(
        initializeAction = { CompletableDeferred<Unit>().await() },
      )
      val secondEngine = FakeLiteRtEngine()
      val factory = FakeLiteRtEngineFactory(firstEngine, secondEngine)
      val runtime = LiteRtStructuredGenerationRuntime(
        modelStore = FakeModelStore("/tmp/model.litertlm"),
        engineFactory = factory,
        modelConfiguration = modelConfiguration(),
        cacheDirectoryPath = "/tmp/gonezo-cache",
        initializationTimeoutMs = 1,
      )

      val failure = assertThrows(StructuredGenerationException::class.java) {
        runBlocking {
          runtime.generate(request("prompt", generationTimeoutMs = 50))
        }
      }
      assertEquals(InterpretationFailureCode.INFERENCE_FAILED, failure.failureCode)
      assertEquals(1, firstEngine.closeCalls.get())
      assertEquals(0, firstEngine.createConversationCalls.get())

      val result = runtime.generate(request("prompt-again"))

      assertEquals("""{"ok":true}""", result.output)
      assertEquals(1, secondEngine.initializeCalls.get())
    }
  }

  @Test
  fun `times out generation cancels the native process before closing the conversation and keeps the engine reusable`() {
    runBlocking {
      val conversationIndex = AtomicInteger(0)
      val engine = FakeLiteRtEngine(
        onConversationCreated = { conversation ->
          val index = conversationIndex.getAndIncrement()
          conversation.onGenerate = {
            if (index == 0) {
              delay(16)
              listOf("first")
            } else {
              listOf("second")
            }
          }
        },
      )
      val runtime = newRuntime(engine, generationTimeoutMs = 15)

      val failure = assertThrows(StructuredGenerationException::class.java) {
        runBlocking {
          runtime.generate(request("prompt", generationTimeoutMs = 90_000))
        }
      }
      assertEquals(InterpretationFailureCode.INFERENCE_FAILED, failure.failureCode)
      assertEquals(1, engine.initializeCalls.get())
      assertEquals(1, engine.conversations.single().cancelProcessCalls.get())
      assertEquals(1, engine.conversations.single().closeCalls.get())
      assertTrue(engine.conversations.single().events.indexOf("cancel") < engine.conversations.single().events.indexOf("close"))
      assertEquals(0, engine.closeCalls.get())

      val reusableResult = runtime.generate(request("prompt-again"))

      assertEquals("second", reusableResult.output)
      assertEquals(1, engine.initializeCalls.get())
      assertEquals(2, engine.createConversationCalls.get())
    }
  }

  @Test
  fun `cancels the active process when the parent coroutine is cancelled`() {
    runBlocking {
      val started = CompletableDeferred<Unit>()
      val engine = FakeLiteRtEngine(
        onConversationCreated = { conversation ->
          conversation.onGenerate = {
            started.complete(Unit)
            awaitCancellation()
          }
        },
      )
      val runtime = newRuntime(engine)

      val job = launch {
        runtime.generate(request("prompt"))
      }

      started.await()
      job.cancelAndJoin()

      assertTrue(job.isCancelled)
      assertEquals(1, engine.conversations.single().cancelProcessCalls.get())
      assertEquals(1, engine.conversations.single().closeCalls.get())
      assertTrue(engine.conversations.single().events.indexOf("cancel") < engine.conversations.single().events.indexOf("close"))
    }
  }

  @Test
  fun `conversation close is idempotent`() {
    runBlocking {
      val engine = FakeLiteRtEngine()
      val runtime = newRuntime(engine)

      runtime.generate(request("prompt"))

      val conversation = engine.conversations.single()
      conversation.close()
      conversation.close()

      assertEquals(1, conversation.closeCalls.get())
    }
  }

  @Test
  fun `close is idempotent and does not initialize the engine just to close it`() {
    runBlocking {
      val engine = FakeLiteRtEngine()
      val runtime = newRuntime(engine)

      runtime.close()
      runtime.close()

      assertEquals(0, engine.initializeCalls.get())
      assertEquals(0, engine.closeCalls.get())
    }
  }

  @Test
  fun `prevents new generations after close`() {
    runBlocking {
      val engine = FakeLiteRtEngine()
      val runtime = newRuntime(engine)

      runtime.generate(request("prompt"))
      runtime.close()

      assertThrows(IllegalStateException::class.java) {
        runBlocking {
          runtime.generate(request("prompt-again"))
        }
      }
    }
  }

  @Test
  fun `does not log transcript prompt or raw model output in the runtime seam`() {
    assertFalse(LiteRtStructuredGenerationRuntime::class.java.name.contains("log"))
  }

  @Test
  fun `source declares the GPU backend cache directory and avoids CPU or multimodal fallbacks`() {
    val source = java.nio.file.Path.of("src/main/kotlin/com/gonezo/multiplatform/plugins/interpretation/runtime/LiteRtStructuredGenerationRuntime.kt").readText()

    assertTrue(source.contains("Backend.GPU"))
    assertTrue(source.contains("cacheDirectoryPath"))
    assertTrue(source.contains("maxNumTokens = MAX_NUM_TOKENS"))
    assertFalse(source.contains("Backend.CPU"))
    assertFalse(source.contains("visionBackend"))
    assertFalse(source.contains("audioBackend"))
  }

  private fun newRuntime(
    engine: FakeLiteRtEngine,
    generationTimeoutMs: Long = LiteRtStructuredGenerationRuntime.GENERATION_TIMEOUT_MS,
  ): LiteRtStructuredGenerationRuntime {
    return LiteRtStructuredGenerationRuntime(
      modelStore = FakeModelStore("/tmp/model.litertlm"),
      engineFactory = FakeLiteRtEngineFactory(engine),
      modelConfiguration = modelConfiguration(),
      cacheDirectoryPath = "/tmp/gonezo-cache",
      generationTimeoutMs = generationTimeoutMs,
    )
  }

  private fun request(
    prompt: String,
    generationTimeoutMs: Long? = null,
  ): StructuredGenerationRequest = StructuredGenerationRequest(
    prompt = prompt,
    spec = dev.solidcoder.interpretation.domain.InterpretationSpec(
      id = dev.solidcoder.interpretation.domain.InterpretationSpecId.of("example"),
      version = dev.solidcoder.interpretation.domain.InterpretationSpecVersion.of("1"),
      fields = listOf(
        dev.solidcoder.interpretation.domain.FieldSpec(
          key = dev.solidcoder.interpretation.domain.FieldKey.of("amount"),
          description = dev.solidcoder.interpretation.domain.FieldDescription.of("Amount"),
          type = dev.solidcoder.interpretation.domain.FieldType.DECIMAL,
        ),
      ),
    ),
    generationTimeoutMs = generationTimeoutMs,
  )

  private fun modelConfiguration(): InterpretationModelConfiguration = InterpretationModelConfiguration(
    modelId = "litert-community/Gemma3-1B-IT",
    modelVersion = "dynamic-int4-q4-ekv4096",
    assetPath = "schema-guided-interpretation/litertlm/Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm",
    fileName = "Gemma3-1B-IT_multi-prefill-seq_q4_ekv4096.litertlm",
    expectedSizeBytes = 584417280L,
    sha256 = "1325ae366d31950f137c9c357b9fa89448b176d76998180c08ceaca78bba98be",
  )

  private class FakeModelStore(
    private val modelPath: String,
  ) : InterpretationModelStore {
    override fun resolveModelPath(): String = modelPath
  }

  private class FakeLiteRtEngineFactory(
    private val engines: ArrayDeque<FakeLiteRtEngine>,
  ) : LiteRtEngineFactory {
    val configurations = mutableListOf<LiteRtEngineConfiguration>()

    constructor(vararg engines: FakeLiteRtEngine) : this(ArrayDeque(engines.toList()))

    override fun create(configuration: LiteRtEngineConfiguration): LiteRtEngineHandle {
      configurations += configuration
      return checkNotNull(if (engines.isEmpty()) null else engines.removeFirst()) { "no more fake engines available" }
    }
  }

  private class FakeLiteRtEngine(
    private val initializeAction: suspend () -> Unit = {},
    private val onConversationCreated: (FakeLiteRtConversation) -> Unit = {},
  ) : LiteRtEngineHandle {
    val initializeCalls = AtomicInteger(0)
    val createConversationCalls = AtomicInteger(0)
    val closeCalls = AtomicInteger(0)
    val conversations = mutableListOf<FakeLiteRtConversation>()
    val conversationConfigurations = mutableListOf<ConversationConfig>()

    override suspend fun initialize() {
      initializeCalls.incrementAndGet()
      initializeAction()
    }

    override fun createConversation(configuration: ConversationConfig): LiteRtConversationHandle {
      createConversationCalls.incrementAndGet()
      conversationConfigurations += configuration
      return FakeLiteRtConversation().also {
        conversations += it
        onConversationCreated(it)
      }
    }

    override fun close() {
      closeCalls.incrementAndGet()
    }
  }

  private class FakeLiteRtConversation : LiteRtConversationHandle {
    var onGenerate: suspend () -> List<String> = { listOf("""{"ok":true}""") }
    val prompts = mutableListOf<String>()
    val closeCalls = AtomicInteger(0)
    val cancelProcessCalls = AtomicInteger(0)
    val events = mutableListOf<String>()
    private var closed = false

    override fun sendMessageStream(prompt: String) = flow {
      prompts += prompt
      onGenerate().forEach { chunk -> emit(chunk) }
    }

    override fun cancelProcess() {
      cancelProcessCalls.incrementAndGet()
      events += "cancel"
    }

    override fun close() {
      if (closed) {
        return
      }
      closed = true
      closeCalls.incrementAndGet()
      events += "close"
    }
  }
}
