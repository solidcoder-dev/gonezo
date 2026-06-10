package com.gonezo.application.orchestration

import java.time.Instant

data class ProcessDueScheduledMovementsCommand(
  val now: Instant,
  val limit: Int = 100,
)

data class ProcessDueScheduledMovementsResult(
  val scanned: Int,
  val posted: Int,
  val expectedCreated: Int,
  val failed: Int,
  val advancedSchedules: Int,
)

interface ProcessDueScheduledMovementsUC {
  fun execute(command: ProcessDueScheduledMovementsCommand): ProcessDueScheduledMovementsResult
}
