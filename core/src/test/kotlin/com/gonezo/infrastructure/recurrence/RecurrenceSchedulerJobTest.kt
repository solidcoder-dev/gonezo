package com.gonezo.infrastructure.recurrence

import com.gonezo.recurrence.application.ProcessDueRecurringMovementsCommand
import com.gonezo.recurrence.application.ProcessDueRecurringMovementsResult
import com.gonezo.recurrence.application.ProcessDueRecurringMovementsUC
import com.gonezo.recurrence.application.PublishRecurrenceOutboxCommand
import com.gonezo.recurrence.application.PublishRecurrenceOutboxResult
import com.gonezo.recurrence.application.PublishRecurrenceOutboxUC
import com.gonezo.recurrence.infrastructure.scheduling.RecurrenceSchedulerJob
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

class RecurrenceSchedulerJobTest {
  @Test
  fun `scheduler executes due processing and outbox publishing with same clock instant`() {
    var processCommand: ProcessDueRecurringMovementsCommand? = null
    var publishCommand: PublishRecurrenceOutboxCommand? = null
    val fixedNow = Instant.parse("2026-04-11T12:00:00Z")

    val processDueUC = object : ProcessDueRecurringMovementsUC {
      override fun execute(command: ProcessDueRecurringMovementsCommand): ProcessDueRecurringMovementsResult {
        processCommand = command
        return ProcessDueRecurringMovementsResult(
          scanned = 3,
          createdOccurrences = 2,
          advancedSchedules = 3,
        )
      }
    }
    val publishUC = object : PublishRecurrenceOutboxUC {
      override fun execute(command: PublishRecurrenceOutboxCommand): PublishRecurrenceOutboxResult {
        publishCommand = command
        return PublishRecurrenceOutboxResult(
          processed = 2,
          published = 2,
          failed = 0,
        )
      }
    }

    val scheduler = RecurrenceSchedulerJob(
      processDueRecurringMovementsUC = processDueUC,
      publishRecurrenceOutboxUC = publishUC,
      clock = Clock.fixed(fixedNow, ZoneOffset.UTC),
    )
    val result = scheduler.run(batchSize = 250)

    assertThat(processCommand).isNotNull()
    assertThat(publishCommand).isNotNull()
    val process = requireNotNull(processCommand)
    val publish = requireNotNull(publishCommand)
    assertThat(process.now).isEqualTo(fixedNow)
    assertThat(process.limit).isEqualTo(250)
    assertThat(publish.publishedAt).isEqualTo(fixedNow)
    assertThat(publish.limit).isEqualTo(250)
    assertThat(result.dueProcessing.createdOccurrences).isEqualTo(2)
    assertThat(result.outboxPublishing.published).isEqualTo(2)
  }
}
