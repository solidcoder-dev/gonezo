package com.gonezo.domain.recurrence

import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurringMovementStatus
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class RecurrenceScaffoldTest {

  @Test
  fun `parses base enums from persisted values`() {
    assertThat(RecurrenceFrequency.from("daily")).isEqualTo(RecurrenceFrequency.DAILY)
    assertThat(RecurringMovementStatus.from("active")).isEqualTo(RecurringMovementStatus.ACTIVE)
  }

  @Test
  fun `validates end after occurrences must be positive`() {
    assertThatThrownBy { RecurrenceEnd.AfterOccurrences(0) }
      .isInstanceOf(IllegalArgumentException::class.java)
      .hasMessageContaining("greater than 0")
  }
}
