package com.gonezo.application.orchestration

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.recurrence.application.CreateRecurringMovementCommand
import com.gonezo.recurrence.application.CreateRecurringMovementUC
import com.gonezo.recurrence.application.DeactivateRecurringMovementCommand
import com.gonezo.recurrence.application.DeactivateRecurringMovementUC
import com.gonezo.recurrence.application.UpdateRecurringMovementCommand
import com.gonezo.recurrence.application.UpdateRecurringMovementUC
import com.gonezo.sharing.application.RecurringSharePlanService
import com.gonezo.sharing.application.SharingPlanChange
import com.gonezo.recurrence.domain.RecurringMovementId
import java.time.Instant

class CreateRecurringMovementWorkflow(
  private val createRecurringMovement: CreateRecurringMovementUC,
  private val sharePlans: RecurringSharePlanService,
  private val projectInitialOccurrence: ExpectedOccurrenceProjectionService,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) {
  fun execute(command: CreateRecurringMovementCommand, sharingPlan: SharingPlanChange = SharingPlanChange.Keep): RecurringMovementId =
    consistencyBoundary.withinConsistencyBoundary {
      val id = createRecurringMovement.execute(command)
      applySharingPlan(id, sharingPlan, command.createdAt)
      projectInitialOccurrence.projectNext(id.toString(), command.createdAt)
      id
    }

  private fun applySharingPlan(id: RecurringMovementId, change: SharingPlanChange, at: Instant) {
    when (change) {
      SharingPlanChange.Keep -> Unit
      SharingPlanChange.Remove -> sharePlans.remove(id.toString())
      is SharingPlanChange.Replace -> sharePlans.createOrUpdate(change.plan.copy(recurringMovementId = id.toString(), savedAt = at))
    }
  }
}

class UpdateRecurringMovementWorkflow(
  private val updateRecurringMovement: UpdateRecurringMovementUC,
  private val sharePlans: RecurringSharePlanService,
  private val projectFutureOccurrence: ExpectedOccurrenceProjectionService,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) {
  fun execute(command: UpdateRecurringMovementCommand, sharingPlan: SharingPlanChange): RecurringMovementId =
    consistencyBoundary.withinConsistencyBoundary {
      updateRecurringMovement.execute(command)
      when (sharingPlan) {
        SharingPlanChange.Keep -> Unit
        SharingPlanChange.Remove -> sharePlans.remove(command.recurringMovementId.toString())
        is SharingPlanChange.Replace -> sharePlans.createOrUpdate(
          sharingPlan.plan.copy(recurringMovementId = command.recurringMovementId.toString(), savedAt = command.updatedAt),
        )
      }
      projectFutureOccurrence.projectNext(command.recurringMovementId.toString(), command.updatedAt)
      command.recurringMovementId
    }
}

class DeactivateRecurringMovementWorkflow(
  private val deactivateRecurringMovement: DeactivateRecurringMovementUC,
  private val sharePlans: RecurringSharePlanService,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) {
  fun execute(command: DeactivateRecurringMovementCommand): Unit = consistencyBoundary.withinConsistencyBoundary {
    deactivateRecurringMovement.execute(command)
    sharePlans.remove(command.recurringMovementId.toString())
  }
}
