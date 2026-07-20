package com.gonezo.sharing.application

import com.gonezo.application.ConsistencyBoundary
import com.gonezo.application.ImmediateConsistencyBoundary
import com.gonezo.sharing.domain.*
import com.gonezo.sharing.domain.ports.PlannedExpenseShareRepository
import com.gonezo.sharing.domain.ports.RecurringSharePlanRepository
import com.gonezo.sharing.domain.ports.SharingPersonRepository
import java.math.BigDecimal
import java.time.Instant

data class RecurringShareParticipantInput(val personName: String, val parts: Int?, val amount: BigDecimal?, val reimbursable: Boolean)

sealed interface SharingPlanChange {
  data object Keep : SharingPlanChange
  data object Remove : SharingPlanChange
  data class Replace(val plan: CreateRecurringSharePlanCommand) : SharingPlanChange
}

data class CreateRecurringSharePlanCommand(
  val recurringMovementId: String, val movementType: String, val reviewPolicy: String,
  val payerName: String, val mode: RecurringShareAllocationMode, val currency: String,
  val payerParts: Int?, val participants: List<RecurringShareParticipantInput>, val savedAt: Instant,
)

interface RecurringSharePlanService {
  fun createOrUpdate(command: CreateRecurringSharePlanCommand): RecurringSharePlanId
  fun remove(recurringMovementId: String)
}

class DefaultRecurringSharePlanService(
  private val plans: RecurringSharePlanRepository,
  private val people: SharingPersonRepository,
) : RecurringSharePlanService {
  override fun createOrUpdate(command: CreateRecurringSharePlanCommand): RecurringSharePlanId {
    require(command.movementType.trim().lowercase() == "expense") { "Recurring sharing is only supported for expenses" }
    require(command.reviewPolicy.trim().lowercase() == "require_user_confirmation") { "Recurring sharing requires user confirmation" }
    require(command.participants.isNotEmpty()) { "sharing plan requires at least one participant" }
    val payer = findOrCreate(command.payerName, command.savedAt)
    val templates = command.participants.mapIndexed { index, input ->
      val person = findOrCreate(input.personName, command.savedAt)
      RecurringShareParticipantTemplate(
        id = RecurringShareParticipantTemplateId.random(), personId = person.id,
        parts = if (command.mode == RecurringShareAllocationMode.PARTS) {
          require(input.parts != null && input.parts > 0) { "participant parts must be positive" }; input.parts
        } else null,
        fixedAmount = if (command.mode == RecurringShareAllocationMode.AMOUNTS) {
          require(input.amount != null && input.amount > BigDecimal.ZERO) { "participant amount must be positive" }; input.amount
        } else null,
        reimbursable = input.reimbursable, order = index,
      )
    }
    val existing = plans.findByRecurringMovementRef(RecurringMovementRef(command.recurringMovementId))
    val plan = RecurringSharePlan(
      id = existing?.id ?: RecurringSharePlanId.random(), recurringMovementRef = RecurringMovementRef(command.recurringMovementId),
      payerPersonId = payer.id, mode = command.mode, currency = command.currency.trim().uppercase(), payerParts = command.payerParts,
      participants = templates, createdAt = existing?.createdAt ?: command.savedAt, updatedAt = command.savedAt,
    )
    plans.save(plan)
    return plan.id
  }

  override fun remove(recurringMovementId: String) {
    plans.findByRecurringMovementRef(RecurringMovementRef(recurringMovementId))?.let { plans.delete(it.id) }
  }

  private fun findOrCreate(name: String, at: Instant): SharingPerson {
    val normalized = SharingPerson.normalizeName(name)
    return people.findByNormalizedName(normalized) ?: SharingPerson.create(SharingPersonId.random(), name, at).also(people::save)
  }
}

data class ExpectedOccurrenceShareSnapshot(
  val expectedMovementId: String, val recurringMovementId: String, val totalAmount: BigDecimal, val currency: String, val createdAt: Instant,
)

interface PlannedShareInstantiator {
  fun instantiate(snapshot: ExpectedOccurrenceShareSnapshot): PlannedExpenseShare?
}

object NoOpPlannedShareInstantiator : PlannedShareInstantiator {
  override fun instantiate(snapshot: ExpectedOccurrenceShareSnapshot): PlannedExpenseShare? = null
}

class DefaultPlannedShareInstantiator(
  private val plans: RecurringSharePlanRepository,
  private val plannedShares: PlannedExpenseShareRepository,
  private val scaleResolver: CurrencyScaleResolver = DefaultCurrencyScaleResolver,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : PlannedShareInstantiator {
  private val strategies = mapOf(
    RecurringShareAllocationMode.PARTS to PartsExpenseShareAllocationStrategy(),
    RecurringShareAllocationMode.AMOUNTS to AmountExpenseShareAllocationStrategy(),
  )

  override fun instantiate(snapshot: ExpectedOccurrenceShareSnapshot): PlannedExpenseShare? = consistencyBoundary.withinConsistencyBoundary {
    val expectedRef = ExpectedMovementRef(snapshot.expectedMovementId)
    plannedShares.findByExpectedMovementRef(expectedRef)?.let { return@withinConsistencyBoundary it }
    val plan = plans.findByRecurringMovementRef(RecurringMovementRef(snapshot.recurringMovementId))
      ?: return@withinConsistencyBoundary null
    val amounts = strategies.getValue(plan.mode).allocate(snapshot.totalAmount, plan, scaleResolver.scale(snapshot.currency))
    val ordered = plan.participants.sortedBy { it.order }
    PlannedExpenseShare(
      id = PlannedExpenseShareId.random(), expectedMovementRef = expectedRef, sourcePlanId = plan.id,
      payerPersonId = plan.payerPersonId, mode = plan.mode, payerParts = plan.payerParts, totalAmount = snapshot.totalAmount,
      currency = snapshot.currency.trim().uppercase(), participants = ordered.mapIndexed { index, template ->
        PlannedExpenseShareParticipant(PlannedExpenseShareParticipantId.random(), template.personId, template.parts, amounts[index], template.reimbursable, template.order)
      }, status = PlannedExpenseShareStatus.PENDING, materializedTransactionId = null, materializedShareId = null,
      createdAt = snapshot.createdAt, updatedAt = snapshot.createdAt,
    ).also(plannedShares::save)
  }
}

data class FinalPlannedShareParticipant(val personName: String, val amount: BigDecimal, val reimbursable: Boolean)
data class FinalPlannedShareDraft(val payerName: String, val participants: List<FinalPlannedShareParticipant>)
data class MaterializePlannedShareCommand(val expectedMovementId: String, val transactionId: String, val materializedAt: Instant, val finalDraft: FinalPlannedShareDraft? = null)

interface MaterializePlannedShareForPostedTransactionUC { fun execute(command: MaterializePlannedShareCommand): String }

class DefaultMaterializePlannedShareForPostedTransactionService(
  private val plannedShares: PlannedExpenseShareRepository,
  private val people: SharingPersonRepository,
  private val applyShare: ApplyShareToPostedTransactionUC,
  private val consistencyBoundary: ConsistencyBoundary = ImmediateConsistencyBoundary,
) : MaterializePlannedShareForPostedTransactionUC {
  override fun execute(command: MaterializePlannedShareCommand): String = consistencyBoundary.withinConsistencyBoundary {
    val planned = plannedShares.findByExpectedMovementRef(ExpectedMovementRef(command.expectedMovementId))
      ?: throw IllegalStateException("Planned share not found for expected movement: ${command.expectedMovementId}")
    if (planned.status == PlannedExpenseShareStatus.MATERIALIZED) {
      require(planned.materializedTransactionId == command.transactionId) { "planned share belongs to another transaction" }
      return@withinConsistencyBoundary planned.materializedShareId!!.toString()
    }
    check(planned.status == PlannedExpenseShareStatus.PENDING) { "Only pending planned shares can be materialized" }
    val payer = people.findById(planned.payerPersonId) ?: error("Sharing payer not found")
    val participants = command.finalDraft?.participants?.also { validateOverride(it, planned) } ?: planned.participants.sortedBy { it.order }.map {
      val person = people.findById(it.personId) ?: error("Sharing participant not found")
      FinalPlannedShareParticipant(person.displayName, it.amount, it.reimbursable)
    }
    val result = applyShare.execute(ApplyShareToPostedTransactionCommand(
      command.transactionId, command.finalDraft?.payerName ?: payer.displayName,
      participants.map { ApplyShareParticipantCommand(it.personName, it.amount, it.reimbursable) }, command.materializedAt,
    ))
    plannedShares.save(planned.materialize(command.transactionId, ExpenseShareId.from(result.shareId), command.materializedAt))
    result.shareId
  }

  private fun validateOverride(participants: List<FinalPlannedShareParticipant>, planned: PlannedExpenseShare) {
    require(participants.isNotEmpty()) { "sharing override requires participants" }
    val scale = DefaultCurrencyScaleResolver.scale(planned.currency)
    require(participants.all { it.personName.isNotBlank() && it.amount > BigDecimal.ZERO }) {
      "sharing override participants must have a name and positive amount"
    }
    require(participants.sumOf { it.amount } <= planned.totalAmount) {
      "sharing override amounts cannot exceed movement total"
    }
    require(participants.all { it.amount.stripTrailingZeros().scale() <= scale }) {
      "sharing override uses more precision than the transaction currency supports"
    }
  }
}
