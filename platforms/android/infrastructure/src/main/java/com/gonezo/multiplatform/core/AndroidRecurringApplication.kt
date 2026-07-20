package com.gonezo.multiplatform.core

import android.content.Context
import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.orchestration.CreateRecurringMovementWorkflow
import com.gonezo.application.orchestration.DefaultExpectedOccurrenceProjectionService
import com.gonezo.application.orchestration.DeactivateRecurringMovementWorkflow
import com.gonezo.application.orchestration.ExpectedOccurrenceProjectionService
import com.gonezo.application.orchestration.UpdateRecurringMovementWorkflow
import com.gonezo.sharing.application.CreateRecurringSharePlanCommand
import com.gonezo.sharing.application.DefaultPlannedShareInstantiator
import com.gonezo.sharing.application.DefaultRecurringSharePlanService
import com.gonezo.sharing.application.RecurringShareParticipantInput
import com.gonezo.sharing.application.SharingPlanChange
import com.gonezo.sharing.domain.RecurringShareAllocationMode
import com.gonezo.recurrence.application.CreateRecurringMovementService
import com.gonezo.recurrence.application.DeactivateRecurringMovementService
import com.gonezo.recurrence.application.UpdateRecurringMovementService
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.services.RecurrenceScheduleCalculator
import java.time.Clock
import java.time.Instant
import java.math.BigDecimal
import org.json.JSONObject

internal class AndroidRecurringApplication private constructor(context: Context) {
  private val database = CoreDatabase(context.applicationContext)
  private val boundary: ConsistencyBoundary = AndroidConsistencyBoundary(database)
  private val recurring = AndroidRecurringMovementRepository(database)
  private val occurrences = AndroidRecurringMovementOccurrenceRepository(database)
  private val expected = AndroidExpectedMovementRepository(database)
  private val expectedCreate = com.gonezo.expected.application.CreateExpectedMovementService(expected)
  private val plans = AndroidRecurringSharePlanRepository(database)
  private val plannedShares = AndroidPlannedExpenseShareRepository(database)
  private val people = AndroidSharingPersonRepository(database)
  private val instantiator = DefaultPlannedShareInstantiator(plans, plannedShares, consistencyBoundary = boundary)
  private val projection: ExpectedOccurrenceProjectionService = DefaultExpectedOccurrenceProjectionService(
    recurring, occurrences, expected, expectedCreate, plannedShareInstantiator = instantiator,
  )
  private val planService = DefaultRecurringSharePlanService(plans, people)
  private val create = CreateRecurringMovementWorkflow(
    CreateRecurringMovementService(recurring, RecurrenceScheduleCalculator()), planService, projection, boundary,
  )
  private val update = UpdateRecurringMovementWorkflow(
    UpdateRecurringMovementService(recurring, RecurrenceScheduleCalculator()), planService, projection, boundary,
  )
  private val deactivate = DeactivateRecurringMovementWorkflow(
    DeactivateRecurringMovementService(recurring), planService, boundary,
  )
  private val mapper = AndroidRecurringCore.getInstance(context)

  fun create(input: AndroidRecurringCore.CreateRecurringMovementInput, sharingPlan: JSONObject?): String {
    val at = Instant.now(Clock.systemUTC())
    val id = create.execute(mapper.toCreateCommand(input, at), planChange(input.type, input.reviewPolicy, input.currency, sharingPlan, at, null))
    return id.toString()
  }

  fun update(input: AndroidRecurringCore.UpdateRecurringMovementInput, sharingPlanPresent: Boolean, sharingPlan: JSONObject?): String {
    val at = Instant.now(Clock.systemUTC())
    val command = mapper.toUpdateCommand(input, at)
    val change = if (!sharingPlanPresent) SharingPlanChange.Keep else if (sharingPlan == null) SharingPlanChange.Remove else planChange(input.type, input.reviewPolicy, input.currency, sharingPlan, at, command.recurringMovementId.toString())
    update.execute(command, change)
    return command.recurringMovementId.toString()
  }

  fun deactivate(id: String, at: Instant) = deactivate.execute(mapper.toDeactivateCommand(id, at))

  private fun planChange(type: String?, reviewPolicy: String?, currency: String?, raw: JSONObject?, at: Instant, recurringId: String?): SharingPlanChange {
    if (raw == null) return SharingPlanChange.Keep
    val participants = raw.optJSONArray("participants") ?: throw IllegalArgumentException("sharing plan participants are required")
    val inputs = buildList {
      for (index in 0 until participants.length()) {
        val participant = participants.getJSONObject(index)
        add(RecurringShareParticipantInput(
          participant.getString("personName"), participant.optIntOrNull("parts"), participant.optStringOrNull("amount")?.toBigDecimal(), participant.optBoolean("reimbursable", false),
        ))
      }
    }
    val command = CreateRecurringSharePlanCommand(
      recurringId ?: "pending", type ?: "expense", reviewPolicy ?: "automatic", raw.getString("payerName"),
      RecurringShareAllocationMode.from(raw.optString("mode", "parts")), currency ?: "", raw.optIntOrNull("payerParts"), inputs, at,
    )
    return SharingPlanChange.Replace(command)
  }

  private fun JSONObject.optStringOrNull(key: String): String? = if (has(key) && !isNull(key)) optString(key).takeIf { it.isNotBlank() } else null
  private fun JSONObject.optIntOrNull(key: String): Int? = if (has(key) && !isNull(key)) optInt(key) else null
  companion object {
    @Volatile private var instance: AndroidRecurringApplication? = null
    @JvmStatic fun getInstance(context: Context): AndroidRecurringApplication = instance ?: synchronized(this) { instance ?: AndroidRecurringApplication(context).also { instance = it } }
  }
}
