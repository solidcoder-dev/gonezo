package com.gonezo.multiplatform.plugins.interpretation.bootstrap

import android.content.Context
import com.gonezo.multiplatform.plugins.interpretation.model.AndroidInterpretationModelStore
import com.gonezo.multiplatform.plugins.interpretation.model.InterpretationModelConfigurationReader
import com.gonezo.multiplatform.plugins.interpretation.model.InterpretationModelSelector
import com.gonezo.multiplatform.plugins.interpretation.runtime.AndroidInterpretationRuntimeLogger
import com.gonezo.multiplatform.plugins.interpretation.runtime.AndroidElapsedRealtimeProvider
import com.gonezo.multiplatform.plugins.interpretation.runtime.LiteRtStructuredGenerationRuntime
import com.gonezo.multiplatform.plugins.interpretation.runtime.AndroidLiteRtBackendFactory
import com.gonezo.multiplatform.plugins.interpretation.runtime.liteRtEngineFactory
import com.gonezo.multiplatform.plugins.ml.MlExecutionPlan
import com.gonezo.multiplatform.plugins.ml.MlExecutionPlanFactory
import com.gonezo.multiplatform.plugins.ml.AndroidDeviceMlCapabilities
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
  internal val executionPlan get() = runtimeAssembly.executionPlan

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
      val executionPlan = MlExecutionPlanFactory().create(AndroidDeviceMlCapabilities())
      val modelReader = InterpretationModelConfigurationReader(context)
      val configuration = InterpretationModelSelector().select(
        target = executionPlan.interpretation,
        descriptors = listOf(modelReader.read(), modelReader.read(com.gonezo.multiplatform.plugins.ml.MlExecutionTarget.NPU)),
      )
      val backendFactory = AndroidLiteRtBackendFactory(
        nativeLibraryDir = context.applicationInfo.nativeLibraryDir,
      )
      val runtime = LiteRtStructuredGenerationRuntime(
        modelStore = AndroidInterpretationModelStore(
          context = context,
          configuration = configuration,
        ),
        engineFactory = liteRtEngineFactory(backendFactory),
        modelConfiguration = configuration,
        cacheDirectoryPath = context.cacheDir.absolutePath,
        executionTarget = executionPlan.interpretation,
        logger = AndroidInterpretationRuntimeLogger,
        elapsedRealtimeProvider = AndroidElapsedRealtimeProvider,
      )
      return RuntimeAssembly(
        runtime = runtime,
        closeable = runtime,
        configuration = configuration,
        executionPlan = executionPlan,
      )
    }
  }
}

internal class RuntimeAssembly(
  val runtime: dev.solidcoder.interpretation.application.StructuredGenerationRuntime,
  val configuration: com.gonezo.multiplatform.plugins.interpretation.model.InterpretationModelConfiguration,
  private val closeable: Closeable,
  val executionPlan: MlExecutionPlan = MlExecutionPlan(
    speech = com.gonezo.multiplatform.plugins.ml.MlExecutionTarget.CPU,
    interpretation = com.gonezo.multiplatform.plugins.ml.MlExecutionTarget.GPU,
  ),
) : Closeable by closeable
