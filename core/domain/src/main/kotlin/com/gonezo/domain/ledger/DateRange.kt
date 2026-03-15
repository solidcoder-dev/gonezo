package com.gonezo.domain.ledger

import java.time.Instant

data class DateRange(
  val from: Instant,
  val to: Instant,
) {
  init {
    require(!from.isAfter(to)) { "date range must satisfy from <= to" }
  }
}
