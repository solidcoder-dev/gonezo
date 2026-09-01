package com.gonezo.infrastructure.backup

import com.gonezo.application.orchestration.backup.*
import com.gonezo.expected.application.backup.*
import com.gonezo.recurrence.application.backup.*
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

class ApplicationBackupJsonCodec {
    fun encode(document: ApplicationBackupDocument): String = rootObject(document).toString(2)

    fun decode(json: String): ApplicationBackupDocument {
        return try {
            val root = JSONObject(json)
            val format = root.getString("format")
            val formatVersion = root.getInt("formatVersion")
            if (format != ApplicationBackupCoordinator.FORMAT) throw BackupImportException(BackupErrorCode.INVALID_FORMAT, "Unsupported backup format: $format")
            if (formatVersion != ApplicationBackupCoordinator.ROOT_VERSION) throw BackupImportException(BackupErrorCode.UNSUPPORTED_FORMAT_VERSION, "Unsupported backup format version: $formatVersion")
            val createdAt = Instant.parse(root.getString("createdAt"))
            val sectionsObject = root.getJSONObject("sections")
            val sections = BackupSectionId.entries.associateWith { id -> decodeSection(id, sectionsObject.getJSONObject(id.jsonName())) }
            ApplicationBackupDocument(format, formatVersion, createdAt, sections)
        } catch (error: BackupImportException) {
            throw error
        } catch (error: Exception) {
            throw BackupImportException(BackupErrorCode.INVALID_FORMAT, "Invalid application backup JSON: ${error.message}")
        }
    }

    private fun rootObject(document: ApplicationBackupDocument): JSONObject = JSONObject()
        .put("format", document.format)
        .put("formatVersion", document.formatVersion)
        .put("createdAt", document.createdAt.toString())
        .put("sections", JSONObject().apply {
            document.sections.toSortedMap(compareBy { it.name }).forEach { (id, section) ->
                put(id.jsonName(), sectionObject(section))
            }
        })

    private fun sectionObject(section: BackupSection): JSONObject = when (section) {
        is TaxonomyBackupSection -> JSONObject().put("version", section.version).put("data", JSONObject()
            .put("categories", JSONArray(section.categories.sortedBy { it.id }.map(::categoryObject)))
            .put("tags", JSONArray(section.tags.sortedBy { it.id }.map(::tagObject))))
        is LedgerBackupSection -> JSONObject().put("version", section.version).put("data", JSONObject()
            .put("accounts", JSONArray(section.accounts.sortedBy { it.id }.map(::accountObject)))
            .put("movements", JSONArray(section.movements.sortedBy { it.id }.map(::movementObject))))
        is RecurrenceBackupSection -> JSONObject().put("version", section.version).put("data", JSONObject()
            .put("movements", JSONArray(section.movements.sortedBy { it.id }.map(::recurringObject)))
            .put("occurrences", JSONArray(section.occurrences.sortedBy { it.id }.map(::occurrenceObject))))
        is ExpectedBackupSection -> JSONObject().put("version", section.version).put("data", JSONObject()
            .put("movements", JSONArray(section.movements.sortedBy { it.id }.map(::expectedObject))))
        is SharingBackupSection -> JSONObject().put("version", section.version).put("data", JSONObject()
            .put("persons", JSONArray(section.persons.sortedBy { it.id }.map(::personObject)))
            .put("expenseShares", JSONArray(section.expenseShares.sortedBy { it.id }.map(::expenseShareObject)))
            .put("recurringPlans", JSONArray(section.recurringPlans.sortedBy { it.id }.map(::recurringPlanObject)))
            .put("plannedShares", JSONArray(section.plannedShares.sortedBy { it.id }.map(::plannedShareObject))))
        is AnalyticsBackupSection -> JSONObject().put("version", section.version).put("data", JSONObject()
            .put("exclusions", JSONArray(section.exclusions.sortedBy { it.id }.map(::exclusionObject))))
        is PreferencesBackupSection -> JSONObject().put("version", section.version).put("data", JSONObject().putNullable("defaultAccountId", section.defaultAccountId))
        else -> throw BackupImportException(BackupErrorCode.INVALID_DATA, "Unsupported backup section: ${section.sectionId}")
    }

    private fun decodeSection(id: BackupSectionId, value: JSONObject): BackupSection {
        val version = value.getInt("version")
        if (version != 1) throw BackupImportException(BackupErrorCode.UNSUPPORTED_SECTION_VERSION, "Unsupported $id backup version: $version")
        val data = value.getJSONObject("data")
        return when (id) {
            BackupSectionId.TAXONOMY -> TaxonomyBackupSection(data.array("categories").mapObjects(::decodeCategory), data.array("tags").mapObjects(::decodeTag))
            BackupSectionId.LEDGER -> LedgerBackupSection(data.array("accounts").mapObjects(::decodeAccount), data.array("movements").mapObjects(::decodeMovement))
            BackupSectionId.RECURRENCE -> RecurrenceBackupSection(data.array("movements").mapObjects(::decodeRecurring), data.array("occurrences").mapObjects(::decodeOccurrence))
            BackupSectionId.EXPECTED -> ExpectedBackupSection(data.array("movements").mapObjects(::decodeExpected))
            BackupSectionId.SHARING -> SharingBackupSection(
                data.array("persons").mapObjects(::decodePerson), data.array("expenseShares").mapObjects(::decodeExpenseShare),
                data.array("recurringPlans").mapObjects(::decodeRecurringPlan), data.array("plannedShares").mapObjects(::decodePlannedShare),
            )
            BackupSectionId.ANALYTICS -> AnalyticsBackupSection(data.array("exclusions").mapObjects(::decodeExclusion))
            BackupSectionId.PREFERENCES -> PreferencesBackupSection(data.stringOrNull("defaultAccountId"))
        }.also { require(it.version == version) { "Section version mismatch for $id" } }
    }

    private fun categoryObject(v: BackupCategory) = JSONObject().put("id", v.id).put("name", v.name).put("appliesTo", v.appliesTo).put("status", v.status).putNullable("createdAt", v.createdAt?.toString()).putNullable("archivedAt", v.archivedAt?.toString())
    private fun tagObject(v: BackupTag) = JSONObject().put("id", v.id).put("name", v.name).put("status", v.status).putNullable("createdAt", v.createdAt?.toString()).putNullable("archivedAt", v.archivedAt?.toString())
    private fun accountObject(v: BackupAccount) = JSONObject().put("id", v.id).put("name", v.name).put("type", v.type).put("currency", v.currency).put("status", v.status).putNullable("createdAt", v.createdAt?.toString()).putNullable("archivedAt", v.archivedAt?.toString())
    private fun movementObject(v: BackupPostedMovement) = JSONObject().put("id", v.id).put("accountId", v.accountId).put("type", v.type).put("status", v.status).put("occurredAt", v.occurredAt.toString()).put("amount", v.amount).put("currency", v.currency).putNullable("description", v.description).putNullable("merchant", v.merchant).putNullable("categoryId", v.categoryId).putNullable("linkedTransactionId", v.linkedTransactionId).put("splitItems", JSONArray(v.splitItems.map { JSONObject().put("id", it.id).put("name", it.name).put("amount", it.amount).put("currency", it.currency).putNullable("note", it.note).putNullable("categoryId", it.categoryId) })).put("tagIds", JSONArray(v.tagIds.sorted()))
    private fun recurringObject(v: BackupRecurringMovement) = JSONObject().put("id", v.id).put("type", v.type).put("sourceAccountId", v.sourceAccountId).putNullable("targetAccountId", v.targetAccountId).put("amount", v.amount).put("currency", v.currency).putNullable("destinationAmount", v.destinationAmount).putNullable("destinationCurrency", v.destinationCurrency).putNullable("exchangeRate", v.exchangeRate).putNullable("description", v.description).putNullable("merchant", v.merchant).putNullable("categoryId", v.categoryId).put("reviewPolicy", v.reviewPolicy).put("splitItems", JSONArray(v.splitItems.map { JSONObject().put("id", it.id).put("name", it.name).put("amount", it.amount) })).put("rule", JSONObject().put("frequency", v.rule.frequency).put("interval", v.rule.interval).put("weeklyDays", JSONArray(v.rule.weeklyDays)).put("monthlyPattern", v.rule.monthlyPattern).putNullable("dayOfMonth", v.rule.dayOfMonth).putNullable("monthlyWeekOrdinal", v.rule.monthlyWeekOrdinal).putNullable("monthlyWeekday", v.rule.monthlyWeekday)).put("recurrenceEnd", JSONObject().put("kind", v.recurrenceEnd.kind).putNullable("date", v.recurrenceEnd.date).putNullable("count", v.recurrenceEnd.count)).put("startAt", v.startAt).put("zoneId", v.zoneId).putNullable("nextDueAt", v.nextDueAt).put("status", v.status).put("generatedOccurrences", v.generatedOccurrences).put("createdAt", v.createdAt).put("updatedAt", v.updatedAt).putNullable("deactivatedAt", v.deactivatedAt).putNullable("completedAt", v.completedAt).put("tagNames", JSONArray(v.tagNames.sorted()))
    private fun expectedObject(v: BackupExpectedMovement) = JSONObject().put("id", v.id).put("accountId", v.accountId).put("type", v.type).put("amount", v.amount).put("currency", v.currency).put("expectedAt", v.expectedAt).putNullable("description", v.description).putNullable("merchant", v.merchant).putNullable("categoryId", v.categoryId).putNullable("originOccurrenceId", v.originOccurrenceId).putNullable("originRecurringMovementId", v.originRecurringMovementId).put("splitItems", JSONArray(v.splitItems.map { JSONObject().put("id", it.id).put("name", it.name).put("amount", it.amount).putNullable("sourceTemplateItemId", it.sourceTemplateItemId) })).put("status", v.status).putNullable("resolvedTransactionId", v.resolvedTransactionId).put("createdAt", v.createdAt).put("updatedAt", v.updatedAt).putNullable("resolvedAt", v.resolvedAt).putNullable("dismissedAt", v.dismissedAt).put("tagNames", JSONArray(v.tagNames.sorted()))
    private fun personObject(v: BackupSharingPerson) = JSONObject().put("id", v.id).put("displayName", v.displayName).put("normalizedName", v.normalizedName).put("createdAt", v.createdAt).putNullable("archivedAt", v.archivedAt)
    private fun expenseShareObject(v: BackupExpenseShare) = JSONObject().put("id", v.id).put("sourceTransactionId", v.sourceTransactionId).put("payerPersonId", v.payerPersonId).put("totalAmount", v.totalAmount).put("currency", v.currency).put("participants", JSONArray(v.participants.map { JSONObject().put("id", it.id).put("personId", it.personId).put("amount", it.amount).put("reimbursable", it.reimbursable).putNullable("expectedMovementId", it.expectedMovementId) })).put("createdAt", v.createdAt).put("updatedAt", v.updatedAt)
    private fun recurringPlanObject(v: BackupRecurringSharePlan) = JSONObject().put("id", v.id).put("recurringMovementId", v.recurringMovementId).put("payerPersonId", v.payerPersonId).put("mode", v.mode).put("currency", v.currency).putNullable("payerParts", v.payerParts).put("participants", JSONArray(v.participants.map { JSONObject().put("id", it.id).put("personId", it.personId).putNullable("parts", it.parts).putNullable("fixedAmount", it.fixedAmount).put("reimbursable", it.reimbursable).put("order", it.order) })).put("createdAt", v.createdAt).put("updatedAt", v.updatedAt)
    private fun plannedShareObject(v: BackupPlannedExpenseShare) = JSONObject().put("id", v.id).put("expectedMovementId", v.expectedMovementId).putNullable("sourcePlanId", v.sourcePlanId).put("payerPersonId", v.payerPersonId).put("mode", v.mode).putNullable("payerParts", v.payerParts).put("totalAmount", v.totalAmount).put("currency", v.currency).put("participants", JSONArray(v.participants.map { JSONObject().put("id", it.id).put("personId", it.personId).putNullable("parts", it.parts).put("amount", it.amount).put("reimbursable", it.reimbursable).put("order", it.order) })).put("status", v.status).putNullable("materializedTransactionId", v.materializedTransactionId).putNullable("materializedShareId", v.materializedShareId).put("createdAt", v.createdAt).put("updatedAt", v.updatedAt)
    private fun occurrenceObject(v: BackupRecurringOccurrence) = JSONObject().put("id", v.id).put("recurringMovementId", v.recurringMovementId).put("dueAt", v.dueAt).put("status", v.status).putNullable("ledgerTransactionId", v.ledgerTransactionId).putNullable("errorCode", v.errorCode).putNullable("errorMessage", v.errorMessage).put("createdAt", v.createdAt).put("updatedAt", v.updatedAt).putNullable("acknowledgedAt", v.acknowledgedAt)
    private fun exclusionObject(v: BackupAnalyticsExclusion) = JSONObject().put("id", v.id).put("scopeType", v.scopeType).put("scopeId", v.scopeId).put("reason", v.reason).put("createdAt", v.createdAt)

    private fun decodeCategory(o: JSONObject) = BackupCategory(o.getString("id"), o.getString("name"), o.getString("appliesTo"), o.getString("status"), o.instantOrNull("createdAt"), o.instantOrNull("archivedAt"))
    private fun decodeTag(o: JSONObject) = BackupTag(o.getString("id"), o.getString("name"), o.getString("status"), o.instantOrNull("createdAt"), o.instantOrNull("archivedAt"))
    private fun decodeAccount(o: JSONObject) = BackupAccount(o.getString("id"), o.getString("name"), o.getString("type"), o.getString("currency"), o.getString("status"), o.instantOrNull("createdAt"), o.instantOrNull("archivedAt"))
    private fun decodeMovement(o: JSONObject): BackupPostedMovement = BackupPostedMovement(o.getString("id"), o.getString("accountId"), o.getString("type"), o.getString("status"), Instant.parse(o.getString("occurredAt")), o.getString("amount"), o.getString("currency"), o.stringOrNull("description"), o.stringOrNull("merchant"), o.stringOrNull("categoryId"), o.stringOrNull("linkedTransactionId"), o.array("splitItems").mapObjects { item -> BackupSplitItem(item.getString("id"), item.getString("name"), item.getString("amount"), item.getString("currency"), item.stringOrNull("note"), item.stringOrNull("categoryId")) }, o.array("tagIds").mapValues { it.toString() })
    private fun decodeRecurring(o: JSONObject): BackupRecurringMovement { val rule = o.getJSONObject("rule"); val end = o.getJSONObject("recurrenceEnd"); return BackupRecurringMovement(o.getString("id"), o.getString("type"), o.getString("sourceAccountId"), o.stringOrNull("targetAccountId"), o.getString("amount"), o.getString("currency"), o.stringOrNull("destinationAmount"), o.stringOrNull("destinationCurrency"), o.stringOrNull("exchangeRate"), o.stringOrNull("description"), o.stringOrNull("merchant"), o.stringOrNull("categoryId"), o.getString("reviewPolicy"), o.array("splitItems").mapObjects { item -> BackupRecurringSplitItem(item.getString("id"), item.getString("name"), item.getString("amount")) }, BackupRecurrenceRule(rule.getString("frequency"), rule.getInt("interval"), rule.array("weeklyDays").mapValues { it.toString() }, rule.getString("monthlyPattern"), rule.intOrNull("dayOfMonth"), rule.intOrNull("monthlyWeekOrdinal"), rule.stringOrNull("monthlyWeekday")), BackupRecurrenceEnd(end.getString("kind"), end.stringOrNull("date"), end.intOrNull("count")), o.getString("startAt"), o.getString("zoneId"), o.stringOrNull("nextDueAt"), o.getString("status"), o.getInt("generatedOccurrences"), o.getString("createdAt"), o.getString("updatedAt"), o.stringOrNull("deactivatedAt"), o.stringOrNull("completedAt"), o.array("tagNames").mapValues { it.toString() }) }
    private fun decodeOccurrence(o: JSONObject) = BackupRecurringOccurrence(o.getString("id"), o.getString("recurringMovementId"), o.getString("dueAt"), o.getString("status"), o.stringOrNull("ledgerTransactionId"), o.stringOrNull("errorCode"), o.stringOrNull("errorMessage"), o.getString("createdAt"), o.getString("updatedAt"), o.stringOrNull("acknowledgedAt"))
    private fun decodeExpected(o: JSONObject) = BackupExpectedMovement(o.getString("id"), o.getString("accountId"), o.getString("type"), o.getString("amount"), o.getString("currency"), o.getString("expectedAt"), o.stringOrNull("description"), o.stringOrNull("merchant"), o.stringOrNull("categoryId"), o.stringOrNull("originOccurrenceId"), o.stringOrNull("originRecurringMovementId"), o.array("splitItems").mapObjects { item -> BackupExpectedSplitItem(item.getString("id"), item.getString("name"), item.getString("amount"), item.stringOrNull("sourceTemplateItemId")) }, o.getString("status"), o.stringOrNull("resolvedTransactionId"), o.getString("createdAt"), o.getString("updatedAt"), o.stringOrNull("resolvedAt"), o.stringOrNull("dismissedAt"), o.array("tagNames").mapValues { it.toString() })
    private fun decodePerson(o: JSONObject) = BackupSharingPerson(o.getString("id"), o.getString("displayName"), o.getString("normalizedName"), o.getString("createdAt"), o.stringOrNull("archivedAt"))
    private fun decodeExpenseShare(o: JSONObject) = BackupExpenseShare(o.getString("id"), o.getString("sourceTransactionId"), o.getString("payerPersonId"), o.getString("totalAmount"), o.getString("currency"), o.array("participants").mapObjects { item -> BackupShareParticipant(item.getString("id"), item.getString("personId"), item.getString("amount"), item.getBoolean("reimbursable"), item.stringOrNull("expectedMovementId")) }, o.getString("createdAt"), o.getString("updatedAt"))
    private fun decodeRecurringPlan(o: JSONObject) = BackupRecurringSharePlan(o.getString("id"), o.getString("recurringMovementId"), o.getString("payerPersonId"), o.getString("mode"), o.getString("currency"), o.intOrNull("payerParts"), o.array("participants").mapObjects { item -> BackupRecurringShareParticipant(item.getString("id"), item.getString("personId"), item.intOrNull("parts"), item.stringOrNull("fixedAmount"), item.getBoolean("reimbursable"), item.getInt("order")) }, o.getString("createdAt"), o.getString("updatedAt"))
    private fun decodePlannedShare(o: JSONObject) = BackupPlannedExpenseShare(o.getString("id"), o.getString("expectedMovementId"), o.stringOrNull("sourcePlanId"), o.getString("payerPersonId"), o.getString("mode"), o.intOrNull("payerParts"), o.getString("totalAmount"), o.getString("currency"), o.array("participants").mapObjects { item -> BackupPlannedShareParticipant(item.getString("id"), item.getString("personId"), item.intOrNull("parts"), item.getString("amount"), item.getBoolean("reimbursable"), item.getInt("order")) }, o.getString("status"), o.stringOrNull("materializedTransactionId"), o.stringOrNull("materializedShareId"), o.getString("createdAt"), o.getString("updatedAt"))
    private fun decodeExclusion(o: JSONObject) = BackupAnalyticsExclusion(o.getString("id"), o.getString("scopeType"), o.getString("scopeId"), o.getString("reason"), o.getString("createdAt"))

    private fun <T> JSONArray.mapObjects(transform: (JSONObject) -> T): List<T> = (0 until length()).map { transform(getJSONObject(it)) }
    private fun JSONArray.mapValues(transform: (Any) -> String): List<String> = (0 until length()).map { transform(get(it)) }
    private fun JSONObject.array(name: String): JSONArray = getJSONArray(name)
    private fun JSONObject.stringOrNull(name: String): String? = if (has(name) && !isNull(name)) getString(name) else null
    private fun JSONObject.instantOrNull(name: String): Instant? = stringOrNull(name)?.let(Instant::parse)
    private fun JSONObject.intOrNull(name: String): Int? = if (has(name) && !isNull(name)) getInt(name) else null
    private fun JSONObject.putNullable(name: String, value: Any?): JSONObject = put(name, value ?: JSONObject.NULL)
    private fun BackupSectionId.jsonName() = name.lowercase()
}
