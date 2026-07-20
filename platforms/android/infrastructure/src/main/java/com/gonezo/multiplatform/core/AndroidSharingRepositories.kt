package com.gonezo.multiplatform.core

import android.content.ContentValues
import com.gonezo.analytics.domain.AnalyticsExclusion
import com.gonezo.analytics.domain.AnalyticsExclusionReason
import com.gonezo.analytics.domain.AnalyticsExclusionScopeType
import com.gonezo.analytics.domain.ports.AnalyticsExclusionRepository
import com.gonezo.sharing.domain.*
import com.gonezo.sharing.domain.ports.ExpenseShareRepository
import com.gonezo.sharing.domain.ports.PlannedExpenseShareRepository
import com.gonezo.sharing.domain.ports.RecurringSharePlanRepository
import com.gonezo.sharing.domain.ports.SharingPersonRepository
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

internal class AndroidSharingPersonRepository(private val database: CoreDatabase) : SharingPersonRepository {
  override fun save(person: SharingPerson) { database.writableDatabase.insertWithOnConflict("sharing_persons", null, ContentValues().apply {
    put("id", person.id.toString()); put("display_name", person.displayName); put("normalized_name", person.normalizedName); put("created_at", person.createdAt.toString()); putNullable("archived_at", person.archivedAt?.toString())
  }, android.database.sqlite.SQLiteDatabase.CONFLICT_REPLACE).also { check(it != -1L) } }
  override fun findByNormalizedName(normalizedName: String): SharingPerson? = query("normalized_name = ? and archived_at is null", arrayOf(normalizedName)).firstOrNull()
  override fun listActive(): List<SharingPerson> = query("archived_at is null", emptyArray())
  private fun query(where: String, args: Array<String>): List<SharingPerson> = database.readableDatabase.query("sharing_persons", null, where, args, null, null, "display_name asc, id asc").use { c -> buildList { while (c.moveToNext()) add(SharingPerson(SharingPersonId.from(c.getString(c.getColumnIndexOrThrow("id"))), c.getString(c.getColumnIndexOrThrow("display_name")), c.getString(c.getColumnIndexOrThrow("normalized_name")), Instant.parse(c.getString(c.getColumnIndexOrThrow("created_at"))), c.getString(c.getColumnIndexOrThrow("archived_at"))?.let(Instant::parse))) } }
  private fun ContentValues.putNullable(key: String, value: String?) { if (value == null) putNull(key) else put(key, value) }
}

internal class AndroidAnalyticsExclusionRepository(private val database: CoreDatabase) : AnalyticsExclusionRepository {
  override fun save(exclusion: AnalyticsExclusion) { database.writableDatabase.insertWithOnConflict("analytics_exclusions", null, ContentValues().apply { put("id", exclusion.id.toString()); put("scope_type", exclusion.scopeType.value); put("scope_id", exclusion.scopeId); put("reason", exclusion.reason.value); put("created_at", exclusion.createdAt.toString()) }, android.database.sqlite.SQLiteDatabase.CONFLICT_IGNORE) }
  override fun findByScope(scopeType: AnalyticsExclusionScopeType, scopeId: String): List<AnalyticsExclusion> = query("scope_type = ? and scope_id = ?", arrayOf(scopeType.value, scopeId))
  override fun listAll(): List<AnalyticsExclusion> = query(null, emptyArray())
  private fun query(where: String?, args: Array<String>): List<AnalyticsExclusion> = database.readableDatabase.query("analytics_exclusions", null, where, args, null, null, "created_at asc, id asc").use { c -> buildList { while (c.moveToNext()) add(AnalyticsExclusion(UUID.fromString(c.getString(c.getColumnIndexOrThrow("id"))), AnalyticsExclusionScopeType.from(c.getString(c.getColumnIndexOrThrow("scope_type"))), c.getString(c.getColumnIndexOrThrow("scope_id")), AnalyticsExclusionReason.from(c.getString(c.getColumnIndexOrThrow("reason"))), Instant.parse(c.getString(c.getColumnIndexOrThrow("created_at"))))) } }
}

internal class AndroidExpenseShareRepository(private val database: CoreDatabase) : ExpenseShareRepository {
  override fun save(share: ExpenseShare) {
    database.writableDatabase.insertWithOnConflict("sharing_expense_shares", null, ContentValues().apply { put("id", share.id.toString()); put("source_transaction_id", share.sourceTransactionId); put("payer_person_id", share.payerPersonId.toString()); put("total_amount", share.totalAmount.toPlainString()); put("currency", share.currency); put("created_at", share.createdAt.toString()); put("updated_at", share.updatedAt.toString()) }, android.database.sqlite.SQLiteDatabase.CONFLICT_REPLACE)
    database.writableDatabase.delete("sharing_expense_share_participants", "share_id = ?", arrayOf(share.id.toString()))
    share.participants.forEach { p -> database.writableDatabase.insertOrThrow("sharing_expense_share_participants", null, ContentValues().apply { put("id", p.id.toString()); put("share_id", share.id.toString()); put("person_id", p.personId.toString()); put("amount", p.amount.toPlainString()); put("reimbursable", if (p.reimbursable) 1 else 0); if (p.expectedMovementId == null) putNull("expected_movement_id") else put("expected_movement_id", p.expectedMovementId) }) }
  }
  override fun findBySourceTransactionId(sourceTransactionId: String): ExpenseShare? = database.readableDatabase.query("sharing_expense_shares", null, "source_transaction_id = ?", arrayOf(sourceTransactionId), null, null, null, "1").use { c -> if (!c.moveToFirst()) null else mapShare(c) }
  private fun mapShare(c: android.database.Cursor): ExpenseShare {
    val id = ExpenseShareId.from(c.getString(c.getColumnIndexOrThrow("id")))
    val participants = database.readableDatabase.query("sharing_expense_share_participants", null, "share_id = ?", arrayOf(id.toString()), null, null, "id asc").use { rows ->
      buildList {
        while (rows.moveToNext()) add(ShareParticipant(
          ShareParticipantId.from(rows.getString(rows.getColumnIndexOrThrow("id"))),
          SharingPersonId.from(rows.getString(rows.getColumnIndexOrThrow("person_id"))),
          BigDecimal(rows.getString(rows.getColumnIndexOrThrow("amount"))),
          rows.getInt(rows.getColumnIndexOrThrow("reimbursable")) == 1,
          rows.getString(rows.getColumnIndexOrThrow("expected_movement_id")),
        ))
      }
    }
    return ExpenseShare(id, c.getString(c.getColumnIndexOrThrow("source_transaction_id")), SharingPersonId.from(c.getString(c.getColumnIndexOrThrow("payer_person_id"))), BigDecimal(c.getString(c.getColumnIndexOrThrow("total_amount"))), c.getString(c.getColumnIndexOrThrow("currency")), participants, Instant.parse(c.getString(c.getColumnIndexOrThrow("created_at"))), Instant.parse(c.getString(c.getColumnIndexOrThrow("updated_at"))))
  }
}

internal class AndroidRecurringSharePlanRepository(private val database: CoreDatabase) : RecurringSharePlanRepository {
  override fun save(plan: RecurringSharePlan) { database.writableDatabase.insertWithOnConflict("sharing_recurring_plans", null, ContentValues().apply { put("id", plan.id.toString()); put("recurring_movement_ref", plan.recurringMovementRef.value); put("payer_person_id", plan.payerPersonId.toString()); put("mode", plan.mode.value); put("currency", plan.currency); if (plan.payerParts == null) putNull("payer_parts") else put("payer_parts", plan.payerParts); put("created_at", plan.createdAt.toString()); put("updated_at", plan.updatedAt.toString()) }, android.database.sqlite.SQLiteDatabase.CONFLICT_REPLACE); database.writableDatabase.delete("sharing_recurring_plan_participants", "plan_id = ?", arrayOf(plan.id.toString())); plan.participants.forEach { p -> database.writableDatabase.insertOrThrow("sharing_recurring_plan_participants", null, ContentValues().apply { put("id", p.id.toString()); put("plan_id", plan.id.toString()); put("person_id", p.personId.toString()); if (p.parts == null) putNull("participant_parts") else put("participant_parts", p.parts); putNullable("fixed_amount", p.fixedAmount?.toPlainString()); put("reimbursable", if (p.reimbursable) 1 else 0); put("participant_order", p.order) }) } }
  override fun findById(id: RecurringSharePlanId): RecurringSharePlan? = find("id = ?", arrayOf(id.toString()))
  override fun findByRecurringMovementRef(ref: RecurringMovementRef): RecurringSharePlan? = find("recurring_movement_ref = ?", arrayOf(ref.value))
  override fun delete(id: RecurringSharePlanId) { database.writableDatabase.delete("sharing_recurring_plans", "id = ?", arrayOf(id.toString())) }
  private fun find(where: String, args: Array<String>): RecurringSharePlan? = database.readableDatabase.query("sharing_recurring_plans", null, where, args, null, null, null, "1").use { c -> if (!c.moveToFirst()) null else { val id = RecurringSharePlanId(UUID.fromString(c.getString(c.getColumnIndexOrThrow("id")))); val parts = database.readableDatabase.query("sharing_recurring_plan_participants", null, "plan_id = ?", arrayOf(id.toString()), null, null, "participant_order asc").use { rows -> buildList { while (rows.moveToNext()) add(RecurringShareParticipantTemplate(RecurringShareParticipantTemplateId(UUID.fromString(rows.getString(rows.getColumnIndexOrThrow("id")))), SharingPersonId.from(rows.getString(rows.getColumnIndexOrThrow("person_id"))), rows.getString(rows.getColumnIndexOrThrow("participant_parts"))?.toInt(), rows.getString(rows.getColumnIndexOrThrow("fixed_amount"))?.let(::BigDecimal), rows.getInt(rows.getColumnIndexOrThrow("reimbursable")) == 1, rows.getInt(rows.getColumnIndexOrThrow("participant_order")))) } }; RecurringSharePlan(id, RecurringMovementRef(c.getString(c.getColumnIndexOrThrow("recurring_movement_ref"))), SharingPersonId.from(c.getString(c.getColumnIndexOrThrow("payer_person_id"))), RecurringShareAllocationMode.from(c.getString(c.getColumnIndexOrThrow("mode"))), c.getString(c.getColumnIndexOrThrow("currency")), c.getString(c.getColumnIndexOrThrow("payer_parts"))?.toInt(), parts, Instant.parse(c.getString(c.getColumnIndexOrThrow("created_at"))), Instant.parse(c.getString(c.getColumnIndexOrThrow("updated_at")))) } }
  private fun ContentValues.putNullable(key: String, value: String?) { if (value == null) putNull(key) else put(key, value) }
}

internal class AndroidPlannedExpenseShareRepository(private val database: CoreDatabase) : PlannedExpenseShareRepository {
  override fun save(share: PlannedExpenseShare) { database.writableDatabase.insertWithOnConflict("sharing_planned_expense_shares", null, ContentValues().apply { put("id", share.id.toString()); put("expected_movement_ref", share.expectedMovementRef.value); putNullable("source_plan_id", share.sourcePlanId?.toString()); put("payer_person_id", share.payerPersonId.toString()); put("mode", share.mode.value); if (share.payerParts == null) putNull("payer_parts") else put("payer_parts", share.payerParts); put("total_amount", share.totalAmount.toPlainString()); put("currency", share.currency); put("status", share.status.name.lowercase()); putNullable("materialized_transaction_ref", share.materializedTransactionId); putNullable("materialized_share_ref", share.materializedShareId?.toString()); put("created_at", share.createdAt.toString()); put("updated_at", share.updatedAt.toString()) }, android.database.sqlite.SQLiteDatabase.CONFLICT_REPLACE); database.writableDatabase.delete("sharing_planned_expense_share_participants", "planned_share_id = ?", arrayOf(share.id.toString())); share.participants.forEach { p -> database.writableDatabase.insertOrThrow("sharing_planned_expense_share_participants", null, ContentValues().apply { put("id", p.id.toString()); put("planned_share_id", share.id.toString()); put("person_id", p.personId.toString()); if (p.parts == null) putNull("participant_parts") else put("participant_parts", p.parts); put("amount", p.amount.toPlainString()); put("reimbursable", if (p.reimbursable) 1 else 0); put("participant_order", p.order) }) } }
  override fun findById(id: PlannedExpenseShareId): PlannedExpenseShare? = find("id = ?", arrayOf(id.toString()))
  override fun findByExpectedMovementRef(ref: ExpectedMovementRef): PlannedExpenseShare? = find("expected_movement_ref = ?", arrayOf(ref.value))
  private fun find(where: String, args: Array<String>): PlannedExpenseShare? = database.readableDatabase.query("sharing_planned_expense_shares", null, where, args, null, null, null, "1").use { c -> if (!c.moveToFirst()) null else { val id = PlannedExpenseShareId(UUID.fromString(c.getString(c.getColumnIndexOrThrow("id")))); val participants = database.readableDatabase.query("sharing_planned_expense_share_participants", null, "planned_share_id = ?", arrayOf(id.toString()), null, null, "participant_order asc").use { rows -> buildList { while (rows.moveToNext()) add(PlannedExpenseShareParticipant(PlannedExpenseShareParticipantId(UUID.fromString(rows.getString(rows.getColumnIndexOrThrow("id")))), SharingPersonId.from(rows.getString(rows.getColumnIndexOrThrow("person_id"))), rows.getString(rows.getColumnIndexOrThrow("participant_parts"))?.toInt(), BigDecimal(rows.getString(rows.getColumnIndexOrThrow("amount"))), rows.getInt(rows.getColumnIndexOrThrow("reimbursable")) == 1, rows.getInt(rows.getColumnIndexOrThrow("participant_order")))) } }; PlannedExpenseShare(id, ExpectedMovementRef(c.getString(c.getColumnIndexOrThrow("expected_movement_ref"))), c.getString(c.getColumnIndexOrThrow("source_plan_id"))?.let { RecurringSharePlanId(UUID.fromString(it)) }, SharingPersonId.from(c.getString(c.getColumnIndexOrThrow("payer_person_id"))), RecurringShareAllocationMode.from(c.getString(c.getColumnIndexOrThrow("mode"))), c.getString(c.getColumnIndexOrThrow("payer_parts"))?.toInt(), BigDecimal(c.getString(c.getColumnIndexOrThrow("total_amount"))), c.getString(c.getColumnIndexOrThrow("currency")), participants, PlannedExpenseShareStatus.valueOf(c.getString(c.getColumnIndexOrThrow("status")).uppercase()), c.getString(c.getColumnIndexOrThrow("materialized_transaction_ref")), c.getString(c.getColumnIndexOrThrow("materialized_share_ref"))?.let(ExpenseShareId::from), Instant.parse(c.getString(c.getColumnIndexOrThrow("created_at"))), Instant.parse(c.getString(c.getColumnIndexOrThrow("updated_at")))) } }
  private fun ContentValues.putNullable(key: String, value: String?) { if (value == null) putNull(key) else put(key, value) }
}
