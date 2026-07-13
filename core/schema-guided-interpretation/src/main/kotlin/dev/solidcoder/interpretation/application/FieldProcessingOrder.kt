package dev.solidcoder.interpretation.application

import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.InterpretationSpec

fun interface FieldProcessingOrder {
  fun orderedFields(spec: InterpretationSpec): List<FieldSpec>
}

object SpecFieldProcessingOrder : FieldProcessingOrder {
  override fun orderedFields(spec: InterpretationSpec): List<FieldSpec> = spec.fields
}
