package com.gonezo.recurrence.domain

import java.time.LocalDate

sealed interface RecurrenceEnd {
  data object Never : RecurrenceEnd

  data class OnDate(val date: LocalDate) : RecurrenceEnd

  data class AfterOccurrences(val count: Int) : RecurrenceEnd {
    init {
      require(count > 0) { "recurrence end count must be greater than 0" }
    }
  }
}
