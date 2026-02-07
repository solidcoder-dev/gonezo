package com.gonezo.domain.shared

data class YearMonth(
  val year: Int,
  val month: Int,
) {
  init {
    require(month in 1..12) { "month must be between 1 and 12" }
  }
}
