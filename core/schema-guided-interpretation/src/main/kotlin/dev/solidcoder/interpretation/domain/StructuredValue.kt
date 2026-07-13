package dev.solidcoder.interpretation.domain

import java.math.BigDecimal
import java.time.LocalDate

sealed interface StructuredValue {
  data class Text(val value: String) : StructuredValue {
    init {
      require(value.isNotBlank()) { "text value is required" }
    }
  }

  data class Decimal(val value: BigDecimal) : StructuredValue

  data class Date(val value: LocalDate) : StructuredValue

  data class Enum(val stableValue: String) : StructuredValue {
    init {
      require(stableValue.isNotBlank()) { "enum stableValue is required" }
    }
  }

  data class BooleanValue(val value: Boolean) : StructuredValue

  data class Integer(val value: Long) : StructuredValue
}
