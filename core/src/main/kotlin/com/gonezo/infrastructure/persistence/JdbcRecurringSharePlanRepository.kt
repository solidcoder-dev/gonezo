package com.gonezo.sharing.infrastructure.persistence

import com.gonezo.sharing.domain.RecurringMovementRef
import com.gonezo.sharing.domain.RecurringShareAllocationMode
import com.gonezo.sharing.domain.RecurringShareParticipantTemplate
import com.gonezo.sharing.domain.RecurringShareParticipantTemplateId
import com.gonezo.sharing.domain.RecurringSharePlan
import com.gonezo.sharing.domain.RecurringSharePlanId
import com.gonezo.sharing.domain.SharingPersonId
import com.gonezo.sharing.domain.ports.RecurringSharePlanRepository
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import java.math.BigDecimal
import java.time.Instant

class JdbcRecurringSharePlanRepository(
  private val jdbc: NamedParameterJdbcTemplate,
) : RecurringSharePlanRepository {
  override fun save(plan: RecurringSharePlan) {
    jdbc.update("""
      insert into sharing_recurring_plans (id, recurring_movement_ref, payer_person_id, mode, currency, payer_parts, created_at, updated_at)
      values (:id, :movement, :payer, :mode, :currency, :payer_parts, :created_at, :updated_at)
      on conflict(id) do update set recurring_movement_ref=excluded.recurring_movement_ref, payer_person_id=excluded.payer_person_id,
        mode=excluded.mode, currency=excluded.currency, payer_parts=excluded.payer_parts, updated_at=excluded.updated_at
    """.trimIndent(), planParams(plan))
    jdbc.update("delete from sharing_recurring_plan_participants where plan_id = :id", MapSqlParameterSource("id", plan.id.toString()))
    plan.participants.forEach { participant ->
      jdbc.update("""
        insert into sharing_recurring_plan_participants (id, plan_id, person_id, participant_parts, fixed_amount, reimbursable, participant_order)
        values (:id, :plan_id, :person_id, :parts, :amount, :reimbursable, :participant_order)
      """.trimIndent(), MapSqlParameterSource()
        .addValue("id", participant.id.toString()).addValue("plan_id", plan.id.toString())
        .addValue("person_id", participant.personId.toString()).addValue("parts", participant.parts)
        .addValue("amount", participant.fixedAmount?.toPlainString()).addValue("reimbursable", if (participant.reimbursable) 1 else 0)
        .addValue("participant_order", participant.order))
    }
  }

  override fun findById(id: RecurringSharePlanId): RecurringSharePlan? = find("p.id = :id", MapSqlParameterSource("id", id.toString()))

  override fun findByRecurringMovementRef(ref: RecurringMovementRef): RecurringSharePlan? =
    find("p.recurring_movement_ref = :movement", MapSqlParameterSource("movement", ref.value))

  override fun delete(id: RecurringSharePlanId) {
    jdbc.update("delete from sharing_recurring_plans where id = :id", MapSqlParameterSource("id", id.toString()))
  }

  private fun find(where: String, params: MapSqlParameterSource): RecurringSharePlan? {
    val rows = jdbc.query("select p.* from sharing_recurring_plans p where $where limit 1", params) { rs, _ ->
      val planId = RecurringSharePlanId(java.util.UUID.fromString(rs.getString("id")))
      val participants = jdbc.query(
        "select * from sharing_recurring_plan_participants where plan_id = :plan_id order by participant_order",
        MapSqlParameterSource("plan_id", planId.toString()),
      ) { child, _ -> RecurringShareParticipantTemplate(
        RecurringShareParticipantTemplateId(java.util.UUID.fromString(child.getString("id"))), SharingPersonId.from(child.getString("person_id")),
        child.getObject("participant_parts")?.toString()?.toInt(), child.getString("fixed_amount")?.let(::BigDecimal),
        child.getInt("reimbursable") == 1, child.getInt("participant_order"),
      ) }
      RecurringSharePlan(planId, RecurringMovementRef(rs.getString("recurring_movement_ref")), SharingPersonId.from(rs.getString("payer_person_id")),
        RecurringShareAllocationMode.from(rs.getString("mode")), rs.getString("currency"), rs.getObject("payer_parts")?.toString()?.toInt(), participants,
        Instant.parse(rs.getString("created_at")), Instant.parse(rs.getString("updated_at")))
    }
    return rows.firstOrNull()
  }

  private fun planParams(plan: RecurringSharePlan) = MapSqlParameterSource()
    .addValue("id", plan.id.toString()).addValue("movement", plan.recurringMovementRef.value).addValue("payer", plan.payerPersonId.toString())
    .addValue("mode", plan.mode.value).addValue("currency", plan.currency).addValue("payer_parts", plan.payerParts)
    .addValue("created_at", plan.createdAt.toString()).addValue("updated_at", plan.updatedAt.toString())
}
