package com.gonezo.multiplatform.plugins.interpretation.bootstrap

import android.content.Context
import com.gonezo.multiplatform.plugins.interpretation.model.AndroidInterpretationModelStore
import com.gonezo.multiplatform.plugins.interpretation.model.InterpretationModelConfigurationReader
import com.gonezo.multiplatform.plugins.interpretation.runtime.AndroidInterpretationRuntimeLogger
import com.gonezo.multiplatform.plugins.interpretation.runtime.AndroidElapsedRealtimeProvider
import com.gonezo.multiplatform.plugins.interpretation.runtime.LiteRtStructuredGenerationRuntime
import com.gonezo.multiplatform.plugins.interpretation.runtime.liteRtEngineFactory
import dev.solidcoder.interpretation.application.FieldInterpretationPromptCompiler
import dev.solidcoder.interpretation.application.InputInterpreter
import dev.solidcoder.interpretation.application.FieldInterpretationResultDecoder
import dev.solidcoder.interpretation.application.OnDeviceInputInterpreter
import dev.solidcoder.interpretation.application.FieldProcessingOrder
import dev.solidcoder.interpretation.json.JsonFieldInterpretationPromptCompiler
import dev.solidcoder.interpretation.json.JsonFieldInterpretationResultDecoder
import java.io.Closeable

class SchemaGuidedInterpretationCompositionRoot internal constructor(
  private val runtimeAssembly: RuntimeAssembly,
  private val promptCompiler: FieldInterpretationPromptCompiler,
  private val resultDecoder: FieldInterpretationResultDecoder,
  private val fieldProcessingOrder: FieldProcessingOrder,
) : Closeable {
  constructor(context: Context) : this(
    runtimeAssembly = createRuntimeAssembly(context.applicationContext),
    promptCompiler = JsonFieldInterpretationPromptCompiler(),
    resultDecoder = JsonFieldInterpretationResultDecoder(),
    fieldProcessingOrder = GonezoFieldProcessingOrder,
  )

  internal val runtime get() = runtimeAssembly.runtime
  internal val modelConfiguration get() = runtimeAssembly.configuration

  fun createInputInterpreter(): InputInterpreter =
    OnDeviceInputInterpreter(
      promptCompiler = promptCompiler,
      runtime = runtimeAssembly.runtime,
      resultDecoder = resultDecoder,
      fieldProcessingOrder = fieldProcessingOrder,
    )

  override fun close() {
    runtimeAssembly.close()
  }

  companion object {
    private fun createRuntimeAssembly(context: Context): RuntimeAssembly {
      val configuration = InterpretationModelConfigurationReader(context).read()
      val runtime = LiteRtStructuredGenerationRuntime(
        modelStore = AndroidInterpretationModelStore(
          context = context,
          configuration = configuration,
        ),
        engineFactory = liteRtEngineFactory(),
        modelConfiguration = configuration,
        cacheDirectoryPath = context.cacheDir.absolutePath,
        logger = AndroidInterpretationRuntimeLogger,
        elapsedRealtimeProvider = AndroidElapsedRealtimeProvider,
      )
      return RuntimeAssembly(runtime = runtime, closeable = runtime, configuration = configuration)
    }
  }
}

internal class RuntimeAssembly(
  val runtime: dev.solidcoder.interpretation.application.StructuredGenerationRuntime,
  val configuration: com.gonezo.multiplatform.plugins.interpretation.model.InterpretationModelConfiguration,
  private val closeable: Closeable,
) : Closeable by closeable
