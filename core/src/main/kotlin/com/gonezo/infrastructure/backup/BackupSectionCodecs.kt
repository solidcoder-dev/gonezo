package com.gonezo.infrastructure.backup

import com.gonezo.application.backup.contract.BackupSectionId
import com.gonezo.application.orchestration.backup.*
import com.gonezo.expected.application.backup.*
import com.gonezo.recurrence.application.backup.*
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

    private fun category(v: BackupCategory) = JSONObject().put("id", v.id).put("name", v.name).put("appliesTo", v.appliesTo).put("status", v.status).putNullable("createdAt", v.createdAt?.toString()).putNullable("archivedAt", v.archivedAt?.toString())
    private fun tag(v: BackupTag) = JSONObject().put("id", v.id).put("name", v.name).put("status", v.status).putNullable("createdAt", v.createdAt?.toString()).putNullable("archivedAt", v.archivedAt?.toString())
    private fun account(v: BackupAccount) = JSONObject().put("id", v.id).put("name", v.name).put("type", v.type).put("currency", v.currency).put("status", v.status).putNullable("createdAt", v.createdAt?.toString()).putNullable("archivedAt", v.archivedAt?.toString())
    private fun movement(v: BackupPostedMovement) = JSONObject().put("id", v.id).put("accountId", v.accountId).put("type", v.type).put("status", v.status).put("occurredAt", v.occurredAt.toString()).put("amount", v.amount).put("currency", v.currency).putNullable("description", v.description).putNullable("merchant", v.merchant).putNullable("categoryId", v.categoryId).putNullable("linkedTransactionId", v.linkedTransactionId).put("splitItems", JSONArray(v.splitItems.map { JSONObject().put("id", it.id).put("name", it.name).put("amount", it.amount).put("currency", it.currency).putNullable("note", it.note).putNullable("categoryId", it.categoryId) })).put("tagIds", JSONArray(v.tagIds.sorted()))
    private fun recurring(v: BackupRecurringMovement) = JSONObject().put("id", v.id).put("type", v.type).put("sourceAccountId", v.sourceAccountId).putNullable("targetAccountId", v.targetAccountId).put("amount", v.amount).put("currency", v.currency).putNullable("destinationAmount", v.destinationAmount).putNullable("destinationCurrency", v.destinationCurrency).putNullable("exchangeRate", v.exchangeRate).putNullable("description", v.description).putNullable("merchant", v.merchant).putNullable("categoryId", v.categoryId).put("reviewPolicy", v.reviewPolicy).put("splitItems", JSONArray(v.splitItems.map { JSONObject().put("id", it.id).put("name", it.name).put("amount", it.amount) })).put("rule", JSONObject().put("frequency", v.rule.frequency).put("interval", v.rule.interval).put("weeklyDays", JSONArray(v.rule.weeklyDays)).put("monthlyPattern", v.rule.monthlyPattern).putNullable("dayOfMonth", v.rule.dayOfMonth).putNullable("monthlyWeekOrdinal", v.rule.monthlyWeekOrdinal).putNullable("monthlyWeekday", v.rule.monthlyWeekday)).put("recurrenceEnd", JSONObject().put("kind", v.recurrenceEnd.kind).putNullable("date", v.recurrenceEnd.date).putNullable("count", v.recurrenceEnd.count)).put("startAt", v.startAt).put("zoneId", v.zoneId).putNullable("nextDueAt", v.nextDueAt).put("status", v.status).put("generatedOccurrences", v.generatedOccurrences).put("createdAt", v.createdAt).put("updatedAt", v.updatedAt).putNullable("deactivatedAt", v.deactivatedAt).putNullable("completedAt", v.completedAt).put("tagNames", JSONArray(v.tagNames.sorted()))
    private fun expected(v: BackupExpectedMovement) = JSONObject().put("id", v.id).put("accountId", v.accountId).put("type", v.type).put("amount", v.amount).put("currency", v.currency).put("expectedAt", v.expectedAt).putNullable("description", v.description).putNullable("merchant", v.merchant).putNullable("categoryId", v.categoryId).putNullable("originOccurrenceId", v.originOccurrenceId).putNullable("originRecurringMovementId", v.originRecurringMovementId).put("splitItems", JSONArray(v.splitItems.map { JSONObject().put("id", it.id).put("name", it.name).put("amount", it.amount).putNullable("sourceTemplateItemId", it.sourceTemplateItemId) })).put("status", v.status).putNullable("resolvedTransactionId", v.resolvedTransactionId).put("createdAt", v.createdAt).put("updatedAt", v.updatedAt).putNullable("resolvedAt", v.resolvedAt).putNullable("dismissedAt", v.dismissedAt).put("tagNames", JSONArray(v.tagNames.sorted()))
    private fun person(v: BackupSharingPerson) = JSONObject().put("id", v.id).put("name", v.displayName).put("normalizedName", v.normalizedName).put("createdAt", v.createdAt).putNullable("archivedAt", v.archivedAt)
    private fun expenseShare(v: BackupExpenseShare) = JSONObject().put("id", v.id).put("transactionId", v.sourceTransactionId).put("payerPersonId", v.payerPersonId).put("totalAmount", v.totalAmount).put("currency", v.currency).put("participants", JSONArray(v.participants.map { JSONObject().put("id", it.id).put("personId", it.personId).put("amount", it.amount).put("reimbursable", it.reimbursable).putNullable("expectedMovementId", it.expectedMovementId) })).put("createdAt", v.createdAt).put("updatedAt", v.updatedAt)
    private fun recurringPlan(v: BackupRecurringSharePlan) = JSONObject().put("id", v.id).put("recurringMovementId", v.recurringMovementId).put("payerPersonId", v.payerPersonId).put("mode", v.mode).put("currency", v.currency).putNullable("payerParts", v.payerParts).put("participants", JSONArray(v.participants.map { JSONObject().put("id", it.id).put("personId", it.personId).putNullable("parts", it.parts).putNullable("fixedAmount", it.fixedAmount).put("reimbursable", it.reimbursable).put("order", it.order) })).put("createdAt", v.createdAt).put("updatedAt", v.updatedAt)
    private fun plannedShare(v: BackupPlannedExpenseShare) = JSONObject().put("id", v.id).put("expectedMovementId", v.expectedMovementId).putNullable("sourcePlanId", v.sourcePlanId).put("payerPersonId", v.payerPersonId).put("mode", v.mode).putNullable("payerParts", v.payerParts).put("totalAmount", v.totalAmount).put("currency", v.currency).put("participants", JSONArray(v.participants.map { JSONObject().put("id", it.id).put("personId", it.personId).putNullable("parts", it.parts).put("amount", it.amount).put("reimbursable", it.reimbursable).put("order", it.order) })).put("status", v.status).putNullable("materializedTransactionId", v.materializedTransactionId).putNullable("materializedShareId", v.materializedShareId).put("createdAt", v.createdAt).put("updatedAt", v.updatedAt)
    private fun occurrence(v: BackupRecurringOccurrence) = JSONObject().put("id", v.id).put("recurringMovementId", v.recurringMovementId).put("dueAt", v.dueAt).put("status", v.status).putNullable("ledgerTransactionId", v.ledgerTransactionId).putNullable("errorCode", v.errorCode).putNullable("errorMessage", v.errorMessage).put("createdAt", v.createdAt).put("updatedAt", v.updatedAt).putNullable("acknowledgedAt", v.acknowledgedAt)
    private fun exclusion(v: BackupAnalyticsExclusion) = JSONObject().put("id", v.id).put("scopeType", v.scopeType).put("scopeId", v.scopeId).put("reason", v.reason).put("createdAt", v.createdAt)

    private fun decodeCategory(o: JSONObject) = BackupCategory(o.getString("id"), o.getString("name"), o.getString("appliesTo"), o.getString("status"), o.instantOrNull("createdAt"), o.instantOrNull("archivedAt"))
    private fun decodeTag(o: JSONObject) = BackupTag(o.getString("id"), o.getString("name"), o.getString("status"), o.instantOrNull("createdAt"), o.instantOrNull("archivedAt"))
    private fun decodeAccount(o: JSONObject) = BackupAccount(o.getString("id"), o.getString("name"), o.getString("type"), o.getString("currency"), o.getString("status"), o.instantOrNull("createdAt"), o.instantOrNull("archivedAt"))
    private fun decodeMovement(o: JSONObject) = BackupPostedMovement(o.getString("id"), o.getString("accountId"), o.getString("type"), o.getString("status"), Instant.parse(o.getString("occurredAt")), o.getString("amount"), o.getString("currency"), o.stringOrNull("description"), o.stringOrNull("merchant"), o.stringOrNull("categoryId"), o.stringOrNull("linkedTransactionId"), o.array("splitItems").objects { item -> BackupSplitItem(item.getString("id"), item.getString("name"), item.getString("amount"), item.getString("currency"), item.stringOrNull("note"), item.stringOrNull("categoryId")) }, o.array("tagIds").values())
    private fun decodeRecurring(o: JSONObject): BackupRecurringMovement { val rule = o.getJSONObject("rule"); val end = o.getJSONObject("recurrenceEnd"); return BackupRecurringMovement(o.getString("id"), o.getString("type"), o.getString("sourceAccountId"), o.stringOrNull("targetAccountId"), o.getString("amount"), o.getString("currency"), o.stringOrNull("destinationAmount"), o.stringOrNull("destinationCurrency"), o.stringOrNull("exchangeRate"), o.stringOrNull("description"), o.stringOrNull("merchant"), o.stringOrNull("categoryId"), o.getString("reviewPolicy"), o.array("splitItems").objects { item -> BackupRecurringSplitItem(item.getString("id"), item.getString("name"), item.getString("amount")) }, BackupRecurrenceRule(rule.getString("frequency"), rule.getInt("interval"), rule.array("weeklyDays").values(), rule.getString("monthlyPattern"), rule.intOrNull("dayOfMonth"), rule.intOrNull("monthlyWeekOrdinal"), rule.stringOrNull("monthlyWeekday")), BackupRecurrenceEnd(end.getString("kind"), end.stringOrNull("date"), end.intOrNull("count")), o.getString("startAt"), o.getString("zoneId"), o.stringOrNull("nextDueAt"), o.getString("status"), o.getInt("generatedOccurrences"), o.getString("createdAt"), o.getString("updatedAt"), o.stringOrNull("deactivatedAt"), o.stringOrNull("completedAt"), o.array("tagNames").values()) }
    private fun decodeOccurrence(o: JSONObject) = BackupRecurringOccurrence(o.getString("id"), o.getString("recurringMovementId"), o.getString("dueAt"), o.getString("status"), o.stringOrNull("ledgerTransactionId"), o.stringOrNull("errorCode"), o.stringOrNull("errorMessage"), o.getString("createdAt"), o.getString("updatedAt"), o.stringOrNull("acknowledgedAt"))
    private fun decodeExpectedMovement(o: JSONObject) = BackupExpectedMovement(o.getString("id"), o.getString("accountId"), o.getString("type"), o.getString("amount"), o.getString("currency"), o.getString("expectedAt"), o.stringOrNull("description"), o.stringOrNull("merchant"), o.stringOrNull("categoryId"), o.stringOrNull("originOccurrenceId"), o.stringOrNull("originRecurringMovementId"), o.array("splitItems").objects { item -> BackupExpectedSplitItem(item.getString("id"), item.getString("name"), item.getString("amount"), item.stringOrNull("sourceTemplateItemId")) }, o.getString("status"), o.stringOrNull("resolvedTransactionId"), o.getString("createdAt"), o.getString("updatedAt"), o.stringOrNull("resolvedAt"), o.stringOrNull("dismissedAt"), o.array("tagNames").values())
    private fun decodePerson(o: JSONObject) = BackupSharingPerson(o.getString("id"), o.stringOrLegacy("name", "displayName")!!, o.getString("normalizedName"), o.getString("createdAt"), o.stringOrNull("archivedAt"))
    private fun decodeExpenseShare(o: JSONObject) = BackupExpenseShare(o.getString("id"), o.stringOrLegacy("transactionId", "sourceTransactionId")!!, o.getString("payerPersonId"), o.getString("totalAmount"), o.getString("currency"), o.array("participants").objects { item -> BackupShareParticipant(item.getString("id"), item.getString("personId"), item.getString("amount"), item.getBoolean("reimbursable"), item.stringOrNull("expectedMovementId")) }, o.getString("createdAt"), o.getString("updatedAt"))
    private fun decodeRecurringPlan(o: JSONObject) = BackupRecurringSharePlan(o.getString("id"), o.getString("recurringMovementId"), o.getString("payerPersonId"), o.getString("mode"), o.getString("currency"), o.intOrNull("payerParts"), o.array("participants").objects { item -> BackupRecurringShareParticipant(item.getString("id"), item.getString("personId"), item.intOrNull("parts"), item.stringOrNull("fixedAmount"), item.getBoolean("reimbursable"), item.getInt("order")) }, o.getString("createdAt"), o.getString("updatedAt"))
    private fun decodePlannedShare(o: JSONObject) = BackupPlannedExpenseShare(o.getString("id"), o.getString("expectedMovementId"), o.stringOrNull("sourcePlanId"), o.getString("payerPersonId"), o.getString("mode"), o.intOrNull("payerParts"), o.getString("totalAmount"), o.getString("currency"), o.array("participants").objects { item -> BackupPlannedShareParticipant(item.getString("id"), item.getString("personId"), item.intOrNull("parts"), item.getString("amount"), item.getBoolean("reimbursable"), item.getInt("order")) }, o.getString("status"), o.stringOrNull("materializedTransactionId"), o.stringOrNull("materializedShareId"), o.getString("createdAt"), o.getString("updatedAt"))
    private fun decodeExclusion(o: JSONObject) = BackupAnalyticsExclusion(o.getString("id"), o.getString("scopeType"), o.getString("scopeId"), o.getString("reason"), o.getString("createdAt"))
    private fun JSONObject.array(name: String) = getJSONArray(name)
    private fun JSONObject.arrayOrLegacy(name: String, legacy: String) = if (has(name)) getJSONArray(name) else getJSONArray(legacy)
    private fun JSONObject.stringOrNull(name: String): String? = if (has(name) && !isNull(name)) getString(name) else null
    private fun JSONObject.stringOrLegacy(name: String, legacy: String) = stringOrNull(name) ?: stringOrNull(legacy)
    private fun JSONObject.instantOrNull(name: String) = stringOrNull(name)?.let(Instant::parse)
    private fun JSONObject.intOrNull(name: String) = if (has(name) && !isNull(name)) getInt(name) else null
    private fun JSONObject.putNullable(name: String, value: Any?) = put(name, value ?: JSONObject.NULL)
    private fun JSONArray.values() = (0 until length()).map { get(it).toString() }
    private fun <T> JSONArray.objects(transform: (JSONObject) -> T) = (0 until length()).map { transform(getJSONObject(it)) }
class TaxonomyBackupSectionCodec : BackupSectionCodec<TaxonomyBackupSection> {
    override val sectionId = BackupSectionId.TAXONOMY
    override val supportedVersions = setOf(1)
    override fun encode(section: TaxonomyBackupSection) = JSONObject().put("version", section.version).put("data", JSONObject().put("categories", JSONArray(section.categories.sortedBy { it.id }.map(::category))).put("tags", JSONArray(section.tags.sortedBy { it.id }.map(::tag))))
    override fun decode(version: Int, data: JSONObject) = TaxonomyBackupSection(data.array("categories").objects(::decodeCategory), data.array("tags").objects(::decodeTag))
}

class LedgerBackupSectionCodec : BackupSectionCodec<LedgerBackupSection> {
    override val sectionId = BackupSectionId.LEDGER
    override val supportedVersions = setOf(1)
    override fun encode(section: LedgerBackupSection) = JSONObject().put("version", section.version).put("data", JSONObject().put("accounts", JSONArray(section.accounts.sortedBy { it.id }.map(::account))).put("postedMovements", JSONArray(section.movements.sortedBy { it.id }.map(::movement))))
    override fun decode(version: Int, data: JSONObject) = LedgerBackupSection(data.array("accounts").objects(::decodeAccount), data.arrayOrLegacy("postedMovements", "movements").objects(::decodeMovement))
}

class RecurrenceBackupSectionCodec : BackupSectionCodec<RecurrenceBackupSection> {
    override val sectionId = BackupSectionId.RECURRENCE
    override val supportedVersions = setOf(1)
    override fun encode(section: RecurrenceBackupSection) = JSONObject().put("version", section.version).put("data", JSONObject().put("movements", JSONArray(section.movements.sortedBy { it.id }.map(::recurring))).put("occurrences", JSONArray(section.occurrences.sortedBy { it.id }.map(::occurrence))))
    override fun decode(version: Int, data: JSONObject) = RecurrenceBackupSection(data.array("movements").objects(::decodeRecurring), data.array("occurrences").objects(::decodeOccurrence))
}

class ExpectedBackupSectionCodec : BackupSectionCodec<ExpectedBackupSection> {
    override val sectionId = BackupSectionId.EXPECTED
    override val supportedVersions = setOf(1)
    override fun encode(section: ExpectedBackupSection) = JSONObject().put("version", section.version).put("data", JSONObject().put("movements", JSONArray(section.movements.sortedBy { it.id }.map(::expected))))
    override fun decode(version: Int, data: JSONObject) = ExpectedBackupSection(data.array("movements").objects(::decodeExpectedMovement))
}

class SharingBackupSectionCodec : BackupSectionCodec<SharingBackupSection> {
    override val sectionId = BackupSectionId.SHARING
    override val supportedVersions = setOf(1)
    override fun encode(section: SharingBackupSection) = JSONObject().put("version", section.version).put("data", JSONObject().put("persons", JSONArray(section.persons.sortedBy { it.id }.map(::person))).put("expenseShares", JSONArray(section.expenseShares.sortedBy { it.id }.map(::expenseShare))).put("recurringSharingPlans", JSONArray(section.recurringPlans.sortedBy { it.id }.map(::recurringPlan))).put("plannedExpenseShares", JSONArray(section.plannedShares.sortedBy { it.id }.map(::plannedShare))))
    override fun decode(version: Int, data: JSONObject) = SharingBackupSection(data.array("persons").objects(::decodePerson), data.array("expenseShares").objects(::decodeExpenseShare), data.arrayOrLegacy("recurringSharingPlans", "recurringPlans").objects(::decodeRecurringPlan), data.arrayOrLegacy("plannedExpenseShares", "plannedShares").objects(::decodePlannedShare))
}

class AnalyticsBackupSectionCodec : BackupSectionCodec<AnalyticsBackupSection> {
    override val sectionId = BackupSectionId.ANALYTICS
    override val supportedVersions = setOf(1)
    override fun encode(section: AnalyticsBackupSection) = JSONObject().put("version", section.version).put("data", JSONObject().put("exclusions", JSONArray(section.exclusions.sortedBy { it.id }.map(::exclusion))))
    override fun decode(version: Int, data: JSONObject) = AnalyticsBackupSection(data.array("exclusions").objects(::decodeExclusion))
}

class PreferencesBackupSectionCodec : BackupSectionCodec<PreferencesBackupSection> {
    override val sectionId = BackupSectionId.PREFERENCES
    override val supportedVersions = setOf(1)
    override fun encode(section: PreferencesBackupSection) = JSONObject().put("version", section.version).put("data", JSONObject().putNullable("defaultAccountId", section.defaultAccountId))
    override fun decode(version: Int, data: JSONObject) = PreferencesBackupSection(data.stringOrNull("defaultAccountId"))
}
