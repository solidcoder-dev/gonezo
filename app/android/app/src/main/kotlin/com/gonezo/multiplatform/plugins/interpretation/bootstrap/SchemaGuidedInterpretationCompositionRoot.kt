package com.gonezo.multiplatform.plugins.interpretation.bootstrap

import android.content.Context
import android.content.Intent
import com.gonezo.multiplatform.infrastructure.configuration.AndroidProcessingConfigurationReader
import com.gonezo.multiplatform.infrastructure.processing.factory.ProcessingFactory
import com.gonezo.multiplatform.infrastructure.processing.isolation.IsolatedStructuredGenerationRuntime
import com.gonezo.multiplatform.infrastructure.processing.preparation.ProcessingPreparer
import com.gonezo.multiplatform.infrastructure.ml.MlExecutionPlan
import com.gonezo.multiplatform.plugins.interpretation.worker.SchemaGuidedInterpretationWorkerService
import dev.solidcoder.interpretation.application.port.generation.FieldInterpretationPromptCompiler
import dev.solidcoder.interpretation.application.port.generation.FieldInterpretationResultDecoder
import dev.solidcoder.interpretation.application.FieldProcessingOrder
import dev.solidcoder.interpretation.application.OnDeviceInputInterpreter
import dev.solidcoder.interpretation.application.port.InputInterpreter
import dev.solidcoder.interpretation.application.port.generation.StructuredGenerationRuntime
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
  internal val preparer: ProcessingPreparer?
    get() = runtimeAssembly.runtime as? ProcessingPreparer

  fun createInputInterpreter(): InputInterpreter =
    runtimeAssembly.inputInterpreter ?: OnDeviceInputInterpreter(
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
      val processingConfiguration = AndroidProcessingConfigurationReader().read()
      val assembly = ProcessingFactory(
        context = context,
        configuration = processingConfiguration,
        promptCompiler = JsonFieldInterpretationPromptCompiler(),
        resultDecoder = JsonFieldInterpretationResultDecoder(),
        fieldProcessingOrder = GonezoFieldProcessingOrder,
        runtimeFactory = { runtimeContext, selectedModelConfiguration, _ ->
          IsolatedStructuredGenerationRuntime(
            context = runtimeContext,
            workerIntent = Intent(runtimeContext, SchemaGuidedInterpretationWorkerService::class.java),
            modelConfiguration = selectedModelConfiguration,
          )
        },
      ).create()
      return RuntimeAssembly(
        runtime = assembly.runtime,
        closeable = assembly,
        configuration = assembly.configuration,
        executionPlan = assembly.executionPlan,
        inputInterpreter = assembly.inputInterpreter,
      )
    }
  }
}

internal class RuntimeAssembly(
  val runtime: StructuredGenerationRuntime,
  val configuration: com.gonezo.multiplatform.infrastructure.processing.litert.model.InterpretationModelConfiguration,
  private val closeable: Closeable,
  val executionPlan: MlExecutionPlan = MlExecutionPlan(
    speech = com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget.CPU,
    interpretation = com.gonezo.multiplatform.infrastructure.ml.MlExecutionTarget.GPU,
  ),
  val inputInterpreter: InputInterpreter? = null,
) : Closeable by closeable
