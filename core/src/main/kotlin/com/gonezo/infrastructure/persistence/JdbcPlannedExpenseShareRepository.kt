package com.gonezo.sharing.infrastructure.persistence

import com.gonezo.sharing.domain.*
import com.gonezo.sharing.domain.ports.PlannedExpenseShareRepository
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import java.math.BigDecimal
import java.time.Instant

class JdbcPlannedExpenseShareRepository(private val jdbc: NamedParameterJdbcTemplate) : PlannedExpenseShareRepository {
  override fun save(share: PlannedExpenseShare) {
    jdbc.update("""
      insert into sharing_planned_expense_shares (id, expected_movement_ref, source_plan_id, payer_person_id, mode, payer_parts, total_amount, currency, status, materialized_transaction_ref, materialized_share_ref, created_at, updated_at)
      values (:id, :expected, :plan, :payer, :mode, :payer_parts, :total, :currency, :status, :transaction, :materialized, :created, :updated)
      on conflict(id) do update set status=excluded.status, materialized_transaction_ref=excluded.materialized_transaction_ref, materialized_share_ref=excluded.materialized_share_ref, updated_at=excluded.updated_at
    """.trimIndent(), params(share))
    jdbc.update("delete from sharing_planned_expense_share_participants where planned_share_id = :id", MapSqlParameterSource("id", share.id.toString()))
    share.participants.forEach { p -> jdbc.update("""
      insert into sharing_planned_expense_share_participants (id, planned_share_id, person_id, participant_parts, amount, reimbursable, participant_order)
      values (:id, :share, :person, :parts, :amount, :reimbursable, :order)
    """.trimIndent(), MapSqlParameterSource().addValue("id", p.id.toString()).addValue("share", share.id.toString()).addValue("person", p.personId.toString()).addValue("parts", p.parts).addValue("amount", p.amount.toPlainString()).addValue("reimbursable", if (p.reimbursable) 1 else 0).addValue("order", p.order)) }
  }
  override fun findById(id: PlannedExpenseShareId): PlannedExpenseShare? = find("s.id = :id", MapSqlParameterSource("id", id.toString()))
  override fun findByExpectedMovementRef(ref: ExpectedMovementRef): PlannedExpenseShare? = find("s.expected_movement_ref = :expected", MapSqlParameterSource("expected", ref.value))
  private fun find(where: String, params: MapSqlParameterSource): PlannedExpenseShare? = jdbc.query("select s.* from sharing_planned_expense_shares s where $where limit 1", params) { rs, _ ->
    val id = PlannedExpenseShareId(java.util.UUID.fromString(rs.getString("id")))
    val participants = jdbc.query("select * from sharing_planned_expense_share_participants where planned_share_id = :id order by participant_order", MapSqlParameterSource("id", id.toString())) { child, _ -> PlannedExpenseShareParticipant(PlannedExpenseShareParticipantId(java.util.UUID.fromString(child.getString("id"))), SharingPersonId.from(child.getString("person_id")), child.getObject("participant_parts")?.toString()?.toInt(), BigDecimal(child.getString("amount")), child.getInt("reimbursable") == 1, child.getInt("participant_order")) }
    PlannedExpenseShare(id, ExpectedMovementRef(rs.getString("expected_movement_ref")), rs.getString("source_plan_id")?.let { RecurringSharePlanId(java.util.UUID.fromString(it)) }, SharingPersonId.from(rs.getString("payer_person_id")), RecurringShareAllocationMode.from(rs.getString("mode")), rs.getObject("payer_parts")?.toString()?.toInt(), BigDecimal(rs.getString("total_amount")), rs.getString("currency"), participants, PlannedExpenseShareStatus.valueOf(rs.getString("status").uppercase()), rs.getString("materialized_transaction_ref"), rs.getString("materialized_share_ref")?.let(ExpenseShareId::from), Instant.parse(rs.getString("created_at")), Instant.parse(rs.getString("updated_at")))
  }.firstOrNull()
  private fun params(s: PlannedExpenseShare) = MapSqlParameterSource().addValue("id", s.id.toString()).addValue("expected", s.expectedMovementRef.value).addValue("plan", s.sourcePlanId?.toString()).addValue("payer", s.payerPersonId.toString()).addValue("mode", s.mode.value).addValue("payer_parts", s.payerParts).addValue("total", s.totalAmount.toPlainString()).addValue("currency", s.currency).addValue("status", s.status.name.lowercase()).addValue("transaction", s.materializedTransactionId).addValue("materialized", s.materializedShareId?.toString()).addValue("created", s.createdAt.toString()).addValue("updated", s.updatedAt.toString())
}
