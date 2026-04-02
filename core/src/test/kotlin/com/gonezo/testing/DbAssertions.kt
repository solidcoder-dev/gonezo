package com.gonezo.testing

import java.math.BigDecimal

fun decimal(value: Any?): BigDecimal = when (value) {
  null -> BigDecimal.ZERO
  is BigDecimal -> value
  is Number -> BigDecimal(value.toString())
  is String -> BigDecimal(value)
  else -> BigDecimal(value.toString())
}
