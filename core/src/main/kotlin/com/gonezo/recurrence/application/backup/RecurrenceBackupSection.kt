package com.gonezo.recurrence.application.backup

import com.gonezo.application.backup.contract.BackupErrorCode
import com.gonezo.application.backup.contract.BackupImportContext
import com.gonezo.application.backup.contract.BackupImportException
import com.gonezo.application.backup.contract.BackupReference
import com.gonezo.application.backup.contract.BackupReferenceValidationException
import com.gonezo.application.backup.contract.BackupSection
import com.gonezo.application.backup.contract.BackupSectionExporter
import com.gonezo.application.backup.contract.BackupSectionId
import com.gonezo.application.backup.contract.BackupSectionImporter
import com.gonezo.application.backup.contract.BackupValidationResult
import com.gonezo.ledger.domain.ports.LedgerAccountRepository
import com.gonezo.recurrence.domain.MonthlyPattern
import com.gonezo.recurrence.domain.RecurrenceEnd
import com.gonezo.recurrence.domain.RecurrenceFrequency
import com.gonezo.recurrence.domain.RecurrenceRule
import com.gonezo.recurrence.domain.RecurringMovement
import com.gonezo.recurrence.domain.RecurringMovementId
import com.gonezo.recurrence.domain.RecurringMovementOccurrence
import com.gonezo.recurrence.domain.RecurringMovementOccurrenceStatus
import com.gonezo.recurrence.domain.RecurringMovementReviewPolicy
import com.gonezo.recurrence.domain.RecurringMovementStatus
import com.gonezo.recurrence.domain.RecurringMovementType
import com.gonezo.recurrence.domain.ports.RecurringMovementOccurrenceRepository
import com.gonezo.recurrence.domain.ports.RecurringMovementRepository
import java.math.BigDecimal
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

data class BackupRecurringMovement(
    val id: String,
    val type: String,
    val sourceAccountId: String,
    val targetAccountId: String?,
    val amount: String,
    val currency: String,
    val destinationAmount: String?,
    val destinationCurrency: String?,
    val exchangeRate: String?,
    val description: String?,
    val merchant: String?,
    val categoryId: String?,
    val reviewPolicy: String,
    val splitItems: List<BackupRecurringSplitItem>,
    val rule: BackupRecurrenceRule,
    val recurrenceEnd: BackupRecurrenceEnd,
    val startAt: String,
    val zoneId: String,
    val nextDueAt: String?,
    val status: String,
    val generatedOccurrences: Int,
    val createdAt: String,
    val updatedAt: String,
    val deactivatedAt: String?,
    val completedAt: String?,
    val tagNames: List<String>,
)

data class BackupRecurringSplitItem(val id: String, val name: String, val amount: String)
data class BackupRecurrenceRule(val frequency: String, val interval: Int, val weeklyDays: List<String>, val monthlyPattern: String, val dayOfMonth: Int?, val monthlyWeekOrdinal: Int?, val monthlyWeekday: String?)
data class BackupRecurrenceEnd(val kind: String, val date: String?, val count: Int?)
data class BackupRecurringOccurrence(val id: String, val recurringMovementId: String, val dueAt: String, val status: String, val ledgerTransactionId: String?, val errorCode: String?, val errorMessage: String?, val createdAt: String, val updatedAt: String, val acknowledgedAt: String?)

data class RecurrenceBackupSection(val movements: List<BackupRecurringMovement>, val occurrences: List<BackupRecurringOccurrence>) : BackupSection {
    override val sectionId = BackupSectionId.RECURRENCE
    override val version = 1

    override fun references() = movements.map { BackupReference.RecurringMovement(it.id) } + occurrences.map { BackupReference.RecurringOccurrence(it.id) } + movements.flatMap { movement -> movement.splitItems.map { BackupReference.RecurringSplitItem(it.id, movement.id) } }
}

class RecurrenceBackupSectionExporter(private val accountRepository: LedgerAccountRepository, private val movementRepository: RecurringMovementRepository, private val occurrenceRepository: RecurringMovementOccurrenceRepository) : BackupSectionExporter {
    override val sectionId = BackupSectionId.RECURRENCE
    override val version = 1

    override fun export(): RecurrenceBackupSection {
        val movements = accountRepository.listAll()
            .flatMap { movementRepository.listBySourceAccount(it.id.value.toString()) }
            .distinctBy { it.id }
            .sortedBy { it.id.value.toString() }
        return RecurrenceBackupSection(
            movements = movements.map(::movement),
            occurrences = movements.flatMap { movement ->
                occurrenceRepository.listByRecurringMovement(movement.id)
            }.map(::occurrence).sortedBy { it.id },
        )
    }

    private fun movement(value: RecurringMovement) = BackupRecurringMovement(
        id = value.id.value.toString(), type = value.type.value, sourceAccountId = value.sourceAccountId,
        targetAccountId = value.targetAccountId, amount = value.amount.toPlainString(), currency = value.currency,
        destinationAmount = value.destinationAmount?.toPlainString(), destinationCurrency = value.destinationCurrency,
        exchangeRate = value.exchangeRate?.toPlainString(), description = value.description, merchant = value.merchant,
        categoryId = value.categoryId, reviewPolicy = value.reviewPolicy.value,
        splitItems = value.splitItems.map { BackupRecurringSplitItem(it.id, it.name, it.amount.toPlainString()) },
        rule = BackupRecurrenceRule(value.rule.frequency.value, value.rule.interval, value.rule.weeklyDays.map { it.name }.sorted(), value.rule.monthlyPattern.value, value.rule.dayOfMonth, value.rule.monthlyWeekOrdinal, value.rule.monthlyWeekday?.name),
        recurrenceEnd = when (val end = value.recurrenceEnd) {
            RecurrenceEnd.Never -> BackupRecurrenceEnd("never", null, null)
            is RecurrenceEnd.OnDate -> BackupRecurrenceEnd("on_date", end.date.toString(), null)
            is RecurrenceEnd.AfterOccurrences -> BackupRecurrenceEnd("after_occurrences", null, end.count)
        },
        startAt = value.startAt.toString(), zoneId = value.zoneId, nextDueAt = value.nextDueAt?.toString(),
        status = value.status.value, generatedOccurrences = value.generatedOccurrences,
        createdAt = value.createdAt.toString(), updatedAt = value.updatedAt.toString(),
        deactivatedAt = value.deactivatedAt?.toString(), completedAt = value.completedAt?.toString(), tagNames = value.tagNames.sorted(),
    )

    private fun occurrence(value: com.gonezo.recurrence.domain.RecurringMovementOccurrence) = BackupRecurringOccurrence(
        id = value.id.toString(), recurringMovementId = value.recurringMovementId.value.toString(), dueAt = value.dueAt.toString(),
        status = value.status.value, ledgerTransactionId = value.ledgerTransactionId, errorCode = value.errorCode,
        errorMessage = value.errorMessage, createdAt = value.createdAt.toString(), updatedAt = value.updatedAt.toString(), acknowledgedAt = value.acknowledgedAt?.toString(),
    )
}

class RecurrenceBackupSectionImporter(private val movementRepository: RecurringMovementRepository, private val occurrenceRepository: RecurringMovementOccurrenceRepository) : BackupSectionImporter {
    override val sectionId = BackupSectionId.RECURRENCE
    override val supportedVersions = setOf(1)
    override val dependencies = setOf(BackupSectionId.TAXONOMY, BackupSectionId.LEDGER)
    override fun validate(section: BackupSection, context: BackupImportContext): BackupValidationResult = try {
        val recurrence = section as? RecurrenceBackupSection ?: return BackupValidationResult.Invalid(BackupErrorCode.INVALID_DATA, "Expected recurrence backup section")
        val movementIds = uniqueIds(recurrence.movements.map { it.id }, "recurring movement")
        recurrence.movements.forEach { movement ->
            uniqueIds(movement.splitItems.map { it.id }, "recurring split item")
            requireContext(context.validationContext.containsAccount(movement.sourceAccountId), "recurring source account", movement.sourceAccountId)
            movement.targetAccountId?.let { requireContext(context.validationContext.containsAccount(it), "recurring target account", it) }
            movement.categoryId?.let { requireContext(context.validationContext.containsCategory(it), "recurring category", it) }
            RecurringMovementType.from(movement.type)
            RecurrenceFrequency.from(movement.rule.frequency)
            MonthlyPattern.from(movement.rule.monthlyPattern)
            RecurringMovementStatus.from(movement.status)
            RecurringMovementReviewPolicy.from(movement.reviewPolicy)
            BigDecimal(movement.amount)
            Instant.parse(movement.startAt)
            movement.nextDueAt?.let { Instant.parse(it) }
        }
        recurrence.occurrences.forEach { occurrence ->
            requireReference(movementIds, occurrence.recurringMovementId, "occurrence recurring movement")
            occurrence.ledgerTransactionId?.let { requireContext(context.validationContext.containsMovement(it), "occurrence ledger transaction", it) }
            RecurringMovementOccurrenceStatus.from(occurrence.status)
            Instant.parse(occurrence.dueAt)
            Instant.parse(occurrence.createdAt)
            Instant.parse(occurrence.updatedAt)
        }
        uniqueIds(recurrence.occurrences.map { it.id }, "recurrence occurrence")
        BackupValidationResult.Valid
    } catch (error: IllegalArgumentException) {
        BackupValidationResult.Invalid(if (error is BackupReferenceValidationException) BackupErrorCode.INVALID_REFERENCE else BackupErrorCode.INVALID_DATA, error.message ?: "Invalid recurrence backup section")
    }
    override fun import(section: BackupSection, context: BackupImportContext) {
        val recurrence = section as RecurrenceBackupSection
        recurrence.movements.forEach { value ->
            val end = when (value.recurrenceEnd.kind) {
                "never" -> com.gonezo.recurrence.domain.RecurrenceEnd.Never
                "on_date" -> com.gonezo.recurrence.domain.RecurrenceEnd.OnDate(LocalDate.parse(value.recurrenceEnd.date!!))
                "after_occurrences" -> com.gonezo.recurrence.domain.RecurrenceEnd.AfterOccurrences(value.recurrenceEnd.count!!)
                else -> error("Unsupported recurrence end")
            }
            val rule = RecurrenceRule(RecurrenceFrequency.from(value.rule.frequency), value.rule.interval, value.rule.weeklyDays.map(DayOfWeek::valueOf).toSet(), MonthlyPattern.from(value.rule.monthlyPattern), value.rule.dayOfMonth, value.rule.monthlyWeekOrdinal, value.rule.monthlyWeekday?.let(DayOfWeek::valueOf))
            movementRepository.save(
                RecurringMovement(
                    RecurringMovementId.from(value.id), RecurringMovementType.from(value.type), value.sourceAccountId, value.targetAccountId, BigDecimal(value.amount), value.currency, value.destinationAmount?.let(::BigDecimal), value.destinationCurrency, value.exchangeRate?.let(::BigDecimal), value.description, value.merchant, value.categoryId, RecurringMovementReviewPolicy.from(value.reviewPolicy),
                    value.splitItems.map {
                        RecurringMovement.SplitItem(it.id, it.name, BigDecimal(it.amount))
                    },
                    rule, end, Instant.parse(value.startAt), value.zoneId, value.nextDueAt?.let(Instant::parse), RecurringMovementStatus.from(value.status), value.generatedOccurrences, Instant.parse(value.createdAt), Instant.parse(value.updatedAt), value.deactivatedAt?.let(Instant::parse), value.completedAt?.let(Instant::parse), value.tagNames,
                ),
            )
        }
        recurrence.occurrences.forEach { value -> occurrenceRepository.save(RecurringMovementOccurrence(UUID.fromString(value.id), RecurringMovementId.from(value.recurringMovementId), Instant.parse(value.dueAt), RecurringMovementOccurrenceStatus.from(value.status), value.ledgerTransactionId, value.errorCode, value.errorMessage, Instant.parse(value.createdAt), Instant.parse(value.updatedAt), value.acknowledgedAt?.let(Instant::parse))) }
    }
}

private fun uniqueIds(ids: List<String>, label: String): Set<String> = ids.toSet().also { if (it.size != ids.size || ids.any(String::isBlank)) throw IllegalArgumentException("Duplicate or blank $label id") }
private fun requireReference(ids: Set<String>, id: String, label: String) {
    if (id !in ids) throw BackupReferenceValidationException("Invalid $label reference: $id")
}
private fun requireContext(found: Boolean, label: String, id: String) {
    if (!found) throw BackupReferenceValidationException("Invalid $label reference: $id")
}
