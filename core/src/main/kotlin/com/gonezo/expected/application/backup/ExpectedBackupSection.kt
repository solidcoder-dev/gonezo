package com.gonezo.expected.application.backup

import com.gonezo.application.orchestration.backup.BackupErrorCode
import com.gonezo.application.orchestration.backup.BackupImportContext
import com.gonezo.application.orchestration.backup.BackupImportException
import com.gonezo.application.orchestration.backup.BackupReferenceValidationException
import com.gonezo.application.orchestration.backup.BackupSection
import com.gonezo.application.orchestration.backup.BackupSectionExporter
import com.gonezo.application.orchestration.backup.BackupSectionId
import com.gonezo.application.orchestration.backup.BackupSectionImporter
import com.gonezo.application.orchestration.backup.BackupValidationResult
import com.gonezo.application.orchestration.backup.BackupReference
import com.gonezo.expected.domain.ExpectedMovement
import com.gonezo.expected.domain.ports.ExpectedMovementRepository
import com.gonezo.ledger.domain.ports.LedgerAccountRepository
import com.gonezo.expected.domain.ExpectedMovementId
import com.gonezo.expected.domain.ExpectedMovementStatus
import com.gonezo.expected.domain.ExpectedMovementType
import java.math.BigDecimal
import java.time.Instant

data class BackupExpectedMovement(
    val id: String, val accountId: String, val type: String, val amount: String, val currency: String,
    val expectedAt: String, val description: String?, val merchant: String?, val categoryId: String?,
    val originOccurrenceId: String?, val originRecurringMovementId: String?, val splitItems: List<BackupExpectedSplitItem>,
    val status: String, val resolvedTransactionId: String?, val createdAt: String, val updatedAt: String,
    val resolvedAt: String?, val dismissedAt: String?, val tagNames: List<String>,
)

data class BackupExpectedSplitItem(val id: String, val name: String, val amount: String, val sourceTemplateItemId: String?)

data class ExpectedBackupSection(val movements: List<BackupExpectedMovement>) : BackupSection {
    override val sectionId = BackupSectionId.EXPECTED
    override val version = 1

    override fun references() = movements.map { BackupReference.ExpectedMovement(it.id) }.toSet()
}

class ExpectedBackupSectionExporter(
    private val accountRepository: LedgerAccountRepository,
    private val movementRepository: ExpectedMovementRepository,
) : BackupSectionExporter {
    override val sectionId = BackupSectionId.EXPECTED
    override val version = 1

    override fun export(): ExpectedBackupSection = ExpectedBackupSection(
        accountRepository.listAll()
            .flatMap { movementRepository.listByAccount(it.id.value.toString(), includeClosed = true) }
            .distinctBy { it.id }
            .sortedBy { it.id.value.toString() }
            .map(::movement),
    )

    private fun movement(value: ExpectedMovement) = BackupExpectedMovement(
        id = value.id.value.toString(), accountId = value.accountId, type = value.type.value,
        amount = value.amount.toPlainString(), currency = value.currency, expectedAt = value.expectedAt.toString(),
        description = value.description, merchant = value.merchant, categoryId = value.categoryId,
        originOccurrenceId = value.originOccurrenceId, originRecurringMovementId = value.originRecurringMovementId,
        splitItems = value.splitItems.map { BackupExpectedSplitItem(it.id, it.name, it.amount.toPlainString(), it.sourceTemplateItemId) },
        status = value.status.name.lowercase(), resolvedTransactionId = value.resolvedTransactionId,
        createdAt = value.createdAt.toString(), updatedAt = value.updatedAt.toString(), resolvedAt = value.resolvedAt?.toString(),
        dismissedAt = value.dismissedAt?.toString(), tagNames = value.tagNames.sorted(),
    )
}

class ExpectedBackupSectionImporter(private val repository: ExpectedMovementRepository) : BackupSectionImporter {
    override val sectionId = BackupSectionId.EXPECTED
    override val supportedVersions = setOf(1)
    override val dependencies = setOf(BackupSectionId.TAXONOMY, BackupSectionId.LEDGER, BackupSectionId.RECURRENCE)
    override fun validate(section: BackupSection, context: BackupImportContext): BackupValidationResult = try {
        val expected = section as? ExpectedBackupSection ?: return BackupValidationResult.Invalid(BackupErrorCode.INVALID_DATA, "Expected expected-movement backup section")
        uniqueIds(expected.movements.map { it.id }, "expected movement")
        expected.movements.forEach { movement ->
            requireContext(context.validationContext.containsAccount(movement.accountId), "expected account", movement.accountId)
            movement.originRecurringMovementId?.let { requireContext(context.validationContext.containsRecurringMovement(it), "expected recurring movement", it) }
            movement.originOccurrenceId?.let { requireContext(context.validationContext.containsRecurringOccurrence(it), "expected occurrence", it) }
            movement.categoryId?.let { requireContext(context.validationContext.containsCategory(it), "expected category", it) }
            movement.resolvedTransactionId?.let { requireContext(context.validationContext.containsMovement(it), "resolved transaction", it) }
            movement.splitItems.forEach { item -> item.sourceTemplateItemId?.let { source -> requireReference(movement.splitItems.map { value -> value.id }.toSet(), source, "expected source template item") } }
            ExpectedMovementType.from(movement.type); ExpectedMovementStatus.from(movement.status); BigDecimal(movement.amount); Instant.parse(movement.expectedAt); Instant.parse(movement.createdAt); Instant.parse(movement.updatedAt)
        }
        BackupValidationResult.Valid
    } catch (error: IllegalArgumentException) { BackupValidationResult.Invalid(if (error is BackupReferenceValidationException) BackupErrorCode.INVALID_REFERENCE else BackupErrorCode.INVALID_DATA, error.message ?: "Invalid expected backup section") }
    override fun import(section: BackupSection, context: BackupImportContext) {
        (section as ExpectedBackupSection).movements.forEach { value -> repository.save(ExpectedMovement(ExpectedMovementId.from(value.id), value.accountId, ExpectedMovementType.from(value.type), BigDecimal(value.amount), value.currency, Instant.parse(value.expectedAt), value.description, value.merchant, value.categoryId, value.originOccurrenceId, value.originRecurringMovementId, value.splitItems.map { ExpectedMovement.SplitItem(it.id, it.name, BigDecimal(it.amount), it.sourceTemplateItemId) }, ExpectedMovementStatus.from(value.status), value.resolvedTransactionId, Instant.parse(value.createdAt), Instant.parse(value.updatedAt), value.resolvedAt?.let(Instant::parse), value.dismissedAt?.let(Instant::parse), value.tagNames)) }
    }
}

private fun uniqueIds(ids: List<String>, label: String): Set<String> = ids.toSet().also { if (it.size != ids.size || ids.any(String::isBlank)) throw IllegalArgumentException("Duplicate or blank $label id") }
private fun requireReference(ids: Set<String>, id: String, label: String) { if (id !in ids) throw BackupReferenceValidationException("Invalid $label reference: $id") }
private fun requireContext(found: Boolean, label: String, id: String) { if (!found) throw BackupReferenceValidationException("Invalid $label reference: $id") }
