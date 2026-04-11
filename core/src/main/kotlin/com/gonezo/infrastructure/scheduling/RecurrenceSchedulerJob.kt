package com.gonezo.recurrence.infrastructure.scheduling

import com.gonezo.recurrence.application.ProcessDueRecurringMovementsCommand
import com.gonezo.recurrence.application.ProcessDueRecurringMovementsResult
import com.gonezo.recurrence.application.ProcessDueRecurringMovementsUC
import com.gonezo.recurrence.application.PublishRecurrenceOutboxCommand
import com.gonezo.recurrence.application.PublishRecurrenceOutboxResult
import com.gonezo.recurrence.application.PublishRecurrenceOutboxUC
import java.time.Clock

data class RecurrenceSchedulerRunResult(
  val dueProcessing: ProcessDueRecurringMovementsResult,
  val outboxPublishing: PublishRecurrenceOutboxResult,
)

class RecurrenceSchedulerJob(
  private val processDueRecurringMovementsUC: ProcessDueRecurringMovementsUC,
  private val publishRecurrenceOutboxUC: PublishRecurrenceOutboxUC,
  private val clock: Clock = Clock.systemUTC(),
) {
  fun run(batchSize: Int = 100): RecurrenceSchedulerRunResult {
    require(batchSize > 0) { "batchSize must be greater than 0" }
    val now = clock.instant()
    val dueProcessing = processDueRecurringMovementsUC.execute(
      ProcessDueRecurringMovementsCommand(
        now = now,
        limit = batchSize,
      ),
    )
    val outboxPublishing = publishRecurrenceOutboxUC.execute(
      PublishRecurrenceOutboxCommand(
        limit = batchSize,
        publishedAt = now,
      ),
    )
    return RecurrenceSchedulerRunResult(
      dueProcessing = dueProcessing,
      outboxPublishing = outboxPublishing,
    )
  }
}
