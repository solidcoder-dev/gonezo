package com.gonezo.domain.shared

import java.math.BigDecimal

data class Percent(
  val value: BigDecimal,
) {
  init {
    require(value >= BigDecimal.ZERO && value <= BigDecimal.ONE) {
      "percent must be between 0 and 1"
    }
  }
}
