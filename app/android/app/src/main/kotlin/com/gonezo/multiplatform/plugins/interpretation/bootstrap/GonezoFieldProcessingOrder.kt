package com.gonezo.multiplatform.plugins.interpretation.bootstrap

import dev.solidcoder.interpretation.application.FieldProcessingOrder
import dev.solidcoder.interpretation.domain.FieldSpec
import dev.solidcoder.interpretation.domain.InterpretationSpec

internal object GonezoFieldProcessingOrder : FieldProcessingOrder {
  private val orderedKeys = listOf("amount", "type", "categoryId", "note", "occurredOn")

  override fun orderedFields(spec: InterpretationSpec): List<FieldSpec> {
    val fieldsByKey = spec.fields.associateBy { it.key.value }
    val ordered = buildList {
      for (key in orderedKeys) {
        fieldsByKey[key]?.let(::add)
      }
      for (field in spec.fields) {
        if (field.key.value !in orderedKeys) {
          add(field)
        }
      }
    }
    return ordered
  }
}
