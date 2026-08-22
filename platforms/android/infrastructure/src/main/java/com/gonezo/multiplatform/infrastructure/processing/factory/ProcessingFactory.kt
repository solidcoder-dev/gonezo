package com.gonezo.multiplatform.infrastructure.processing.factory

import android.content.Context
import com.gonezo.multiplatform.infrastructure.configuration.AndroidProcessingConfiguration
import com.gonezo.multiplatform.infrastructure.configuration.ProcessingProvider
import com.gonezo.multiplatform.infrastructure.ml.AndroidDeviceMlCapabilities
import com.gonezo.multiplatform.infrastructure.ml.MlExecutionPlan
import com.gonezo.multiplatform.infrastructure.ml.MlExecutionPlanFactory
import com.gonezo.multiplatform.infrastructure.ml.MlPipelineDiagnostics
import com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget
import com.gonezo.multiplatform.infrastructure.ml.NpuTarget
import com.gonezo.multiplatform.infrastructure.processing.litert.model.AndroidInterpretationModelStore
import com.gonezo.multiplatform.infrastructure.processing.litert.model.InterpretationModelConfiguration
import com.gonezo.multiplatform.infrastructure.processing.litert.model.InterpretationModelConfigurationReader
import com.gonezo.multiplatform.infrastructure.processing.litert.model.InterpretationModelSelector
import com.gonezo.multiplatform.infrastructure.processing.litert.runtime.AndroidElapsedRealtimeProvider
import com.gonezo.multiplatform.infrastructure.processing.litert.runtime.AndroidInterpretationRuntimeLogger
import com.gonezo.multiplatform.infrastructure.processing.litert.runtime.AndroidLiteRtBackendFactory
import com.gonezo.multiplatform.infrastructure.processing.litert.runtime.LiteRtStructuredGenerationRuntime
import com.gonezo.multiplatform.infrastructure.processing.litert.runtime.liteRtEngineFactory
import dev.solidcoder.interpretation.application.FieldProcessingOrder
import dev.solidcoder.interpretation.application.OnDeviceInputInterpreter
import dev.solidcoder.interpretation.application.port.InputInterpreter
import dev.solidcoder.interpretation.application.port.generation.FieldInterpretationPromptCompiler
import dev.solidcoder.interpretation.application.port.generation.FieldInterpretationResultDecoder
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRuntime
import java.io.Closeable

internal class ProcessingFactory(
  private val context: Context?,
  private val configuration: AndroidProcessingConfiguration,
  private val promptCompiler: FieldInterpretationPromptCompiler,
  private val resultDecoder: FieldInterpretationResultDecoder,
  private val fieldProcessingOrder: FieldProcessingOrder,
  private val runtimeFactory: ((Context, InterpretationModelConfiguration, MlExecutionPlan) -> StructuredGenerationRuntime)? = null,
  private val modelConfigurationOverride: InterpretationModelConfiguration? = null,
) {
  fun create(): ProcessingAssembly {
    return when (configuration.processingProvider) {
      ProcessingProvider.LOCAL_LITERT -> createLocalLiteRtAssembly()
      ProcessingProvider.REMOTE -> throw ProcessingConfigurationException(
        "Processing provider REMOTE is not implemented yet",
      )
    }
  }

  private fun createLocalLiteRtAssembly(): ProcessingAssembly {
    val androidContext = requireNotNull(context)
    val capabilities = AndroidDeviceMlCapabilities()
    val executionPlan = MlExecutionPlanFactory().create(capabilities)
    val modelConfiguration = modelConfigurationOverride ?: run {
      val modelReader = InterpretationModelConfigurationReader(androidContext)
      InterpretationModelSelector().select(
        target = executionPlan.interpretation,
        descriptors = listOf(
          modelReader.read(),
          modelReader.read(MlExecutionTarget.NPU, NpuTarget.QUALCOMM_SM8750),
          modelReader.read(MlExecutionTarget.NPU, NpuTarget.QUALCOMM_SM8850),
        ),
        npuTarget = capabilities.npuTarget ?: NpuTarget.QUALCOMM_SM8850,
      )
    }
    MlPipelineDiagnostics.executionPlanResolved(
      rawSocModel = capabilities.rawSocModel,
      resolvedNpuTarget = capabilities.npuTarget,
      plan = executionPlan,
      interpretationModel = modelConfiguration.fileName,
    )
    val runtime = createRuntime(androidContext, modelConfiguration, executionPlan)
    return ProcessingAssembly(
      inputInterpreter = OnDeviceInputInterpreter(
        promptCompiler = promptCompiler,
        runtime = runtime,
        resultDecoder = resultDecoder,
        fieldProcessingOrder = fieldProcessingOrder,
      ),
      runtime = runtime,
      configuration = modelConfiguration,
      executionPlan = executionPlan,
    )
  }

  private fun createRuntime(
    context: Context,
    modelConfiguration: InterpretationModelConfiguration,
    executionPlan: MlExecutionPlan,
  ): StructuredGenerationRuntime {
    runtimeFactory?.let { factory ->
      return factory(context, modelConfiguration, executionPlan)
    }
    val backendFactory = AndroidLiteRtBackendFactory(context.applicationInfo.nativeLibraryDir)
    return LiteRtStructuredGenerationRuntime(
      modelStore = AndroidInterpretationModelStore(
        baseDirectory = context.noBackupFilesDir,
        assetReader = { assetPath -> context.assets.open(assetPath) },
        configuration = modelConfiguration,
        logger = AndroidInterpretationRuntimeLogger,
        elapsedRealtimeProvider = AndroidElapsedRealtimeProvider,
      ),
      engineFactory = liteRtEngineFactory(backendFactory),
      modelConfiguration = modelConfiguration,
      cacheDirectoryPath = context.cacheDir.absolutePath,
      executionTarget = executionPlan.interpretation,
      logger = AndroidInterpretationRuntimeLogger,
      elapsedRealtimeProvider = AndroidElapsedRealtimeProvider,
    )
  }
}

internal class ProcessingAssembly(
  val inputInterpreter: InputInterpreter,
  val runtime: StructuredGenerationRuntime,
  val configuration: InterpretationModelConfiguration,
  val executionPlan: MlExecutionPlan,
) : Closeable {
  override fun close() {
    (runtime as? Closeable)?.close()
  }
}

internal class ProcessingConfigurationException(message: String) : IllegalArgumentException(message)
