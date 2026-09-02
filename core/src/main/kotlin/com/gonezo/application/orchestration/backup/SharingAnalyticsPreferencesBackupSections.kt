package com.gonezo.application.orchestration.backup

import com.gonezo.analytics.domain.AnalyticsExclusion
import com.gonezo.analytics.domain.AnalyticsExclusionReason
import com.gonezo.analytics.domain.AnalyticsExclusionScopeType
import com.gonezo.analytics.domain.ports.AnalyticsExclusionRepository
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
import com.gonezo.preferences.domain.DefaultAccountId
import com.gonezo.preferences.domain.PreferencesOwnerId
import com.gonezo.preferences.domain.ports.UserPreferencesRepository
import com.gonezo.sharing.domain.ExpectedMovementRef
import com.gonezo.sharing.domain.ExpenseShare
import com.gonezo.sharing.domain.ExpenseShareId
import com.gonezo.sharing.domain.PlannedExpenseShare
import com.gonezo.sharing.domain.PlannedExpenseShareId
import com.gonezo.sharing.domain.PlannedExpenseShareParticipant
import com.gonezo.sharing.domain.PlannedExpenseShareParticipantId
import com.gonezo.sharing.domain.PlannedExpenseShareStatus
import com.gonezo.sharing.domain.RecurringMovementRef
import com.gonezo.sharing.domain.RecurringShareAllocationMode
import com.gonezo.sharing.domain.RecurringShareParticipantTemplate
import com.gonezo.sharing.domain.RecurringShareParticipantTemplateId
import com.gonezo.sharing.domain.RecurringSharePlan
import com.gonezo.sharing.domain.RecurringSharePlanId
import com.gonezo.sharing.domain.ShareParticipant
import com.gonezo.sharing.domain.ShareParticipantId
import com.gonezo.sharing.domain.SharingPerson
import com.gonezo.sharing.domain.SharingPersonId
import com.gonezo.sharing.domain.ports.ExpenseShareRepository
import com.gonezo.sharing.domain.ports.PlannedExpenseShareRepository
import com.gonezo.sharing.domain.ports.RecurringSharePlanRepository
import com.gonezo.sharing.domain.ports.SharingPersonRepository
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class BackupSharingPerson(val id: String, val displayName: String, val normalizedName: String, val createdAt: String, val archivedAt: String?)
data class BackupShareParticipant(val id: String, val personId: String, val amount: String, val reimbursable: Boolean, val expectedMovementId: String?)
data class BackupExpenseShare(val id: String, val sourceTransactionId: String, val payerPersonId: String, val totalAmount: String, val currency: String, val participants: List<BackupShareParticipant>, val createdAt: String, val updatedAt: String)
data class BackupRecurringSharePlan(val id: String, val recurringMovementId: String, val payerPersonId: String, val mode: String, val currency: String, val payerParts: Int?, val participants: List<BackupRecurringShareParticipant>, val createdAt: String, val updatedAt: String)
data class BackupRecurringShareParticipant(val id: String, val personId: String, val parts: Int?, val fixedAmount: String?, val reimbursable: Boolean, val order: Int)
data class BackupPlannedExpenseShare(val id: String, val expectedMovementId: String, val sourcePlanId: String?, val payerPersonId: String, val mode: String, val payerParts: Int?, val totalAmount: String, val currency: String, val participants: List<BackupPlannedShareParticipant>, val status: String, val materializedTransactionId: String?, val materializedShareId: String?, val createdAt: String, val updatedAt: String)
data class BackupPlannedShareParticipant(val id: String, val personId: String, val parts: Int?, val amount: String, val reimbursable: Boolean, val order: Int)

data class SharingBackupSection(val persons: List<BackupSharingPerson>, val expenseShares: List<BackupExpenseShare>, val recurringPlans: List<BackupRecurringSharePlan>, val plannedShares: List<BackupPlannedExpenseShare>) : BackupSection {
    override val sectionId = BackupSectionId.SHARING
    override val version = 1

    override fun references() = persons.map { BackupReference.SharingPerson(it.id) } +
        expenseShares.flatMap { share -> listOf(BackupReference.ExpenseShare(share.id)) + share.participants.map { BackupReference.ShareParticipant(it.id) } } +
        recurringPlans.flatMap { plan -> listOf(BackupReference.RecurringSharePlan(plan.id)) + plan.participants.map { BackupReference.RecurringShareParticipant(it.id) } } +
        plannedShares.flatMap { share -> listOf(BackupReference.PlannedExpenseShare(share.id)) + share.participants.map { BackupReference.PlannedShareParticipant(it.id) } }
}

class SharingBackupSectionExporter(private val personRepository: SharingPersonRepository, private val expenseShareRepository: ExpenseShareRepository, private val recurringPlanRepository: RecurringSharePlanRepository, private val plannedShareRepository: PlannedExpenseShareRepository) : BackupSectionExporter {
    override val sectionId = BackupSectionId.SHARING
    override val version = 1

    override fun export(): SharingBackupSection = SharingBackupSection(
        persons = personRepository.listAll().map { BackupSharingPerson(it.id.toString(), it.displayName, it.normalizedName, it.createdAt.toString(), it.archivedAt?.toString()) }.sortedBy { it.id },
        expenseShares = expenseShareRepository.listAll().map { share -> BackupExpenseShare(share.id.toString(), share.sourceTransactionId, share.payerPersonId.toString(), share.totalAmount.toPlainString(), share.currency, share.participants.map { BackupShareParticipant(it.id.toString(), it.personId.toString(), it.amount.toPlainString(), it.reimbursable, it.expectedMovementId) }.sortedBy { it.id }, share.createdAt.toString(), share.updatedAt.toString()) }.sortedBy { it.id },
        recurringPlans = recurringPlanRepository.listAll().map { plan -> BackupRecurringSharePlan(plan.id.toString(), plan.recurringMovementRef.value, plan.payerPersonId.toString(), plan.mode.value, plan.currency, plan.payerParts, plan.participants.map { BackupRecurringShareParticipant(it.id.toString(), it.personId.toString(), it.parts, it.fixedAmount?.toPlainString(), it.reimbursable, it.order) }.sortedBy { it.order }, plan.createdAt.toString(), plan.updatedAt.toString()) }.sortedBy { it.id },
        plannedShares = plannedShareRepository.listAll().map { share -> BackupPlannedExpenseShare(share.id.toString(), share.expectedMovementRef.value, share.sourcePlanId?.toString(), share.payerPersonId.toString(), share.mode.value, share.payerParts, share.totalAmount.toPlainString(), share.currency, share.participants.map { BackupPlannedShareParticipant(it.id.toString(), it.personId.toString(), it.parts, it.amount.toPlainString(), it.reimbursable, it.order) }.sortedBy { it.order }, share.status.name.lowercase(), share.materializedTransactionId, share.materializedShareId?.toString(), share.createdAt.toString(), share.updatedAt.toString()) }.sortedBy { it.id },
    )
}

class SharingBackupSectionImporter(private val personRepository: SharingPersonRepository, private val expenseShareRepository: ExpenseShareRepository, private val recurringPlanRepository: RecurringSharePlanRepository, private val plannedShareRepository: PlannedExpenseShareRepository) : BackupSectionImporter {
    override val sectionId = BackupSectionId.SHARING
    override val supportedVersions = setOf(1)
    override val dependencies = setOf(BackupSectionId.LEDGER, BackupSectionId.EXPECTED, BackupSectionId.RECURRENCE)

    override fun validate(section: BackupSection, context: BackupImportContext): BackupValidationResult {
        if (section !is SharingBackupSection) return BackupValidationResult.Invalid(BackupErrorCode.INVALID_DATA, "Expected sharing backup section")
        return try {
            val people = uniqueIds(section.persons.map { it.id }, "sharing person")
            section.expenseShares.forEach { share ->
                uniqueIds(share.participants.map { it.id }, "expense share participant")
                requireContext(context.validationContext.containsMovement(share.sourceTransactionId), "expense share movement", share.sourceTransactionId)
                requireReference(people, share.payerPersonId, "expense share payer")
                BigDecimal(share.totalAmount)
                Instant.parse(share.createdAt)
                Instant.parse(share.updatedAt)
                share.participants.forEach { participant ->
                    requireReference(people, participant.personId, "expense share participant")
                    participant.expectedMovementId?.let { requireContext(context.validationContext.containsExpectedMovement(it), "expense share participant expected movement", it) }
                    BigDecimal(participant.amount)
                }
            }
            section.recurringPlans.forEach { plan ->
                uniqueIds(plan.participants.map { it.id }, "recurring share participant")
                requireContext(context.validationContext.containsRecurringMovement(plan.recurringMovementId), "recurring share plan movement", plan.recurringMovementId)
                requireReference(people, plan.payerPersonId, "recurring share plan payer")
                RecurringShareAllocationMode.from(plan.mode)
                Instant.parse(plan.createdAt)
                Instant.parse(plan.updatedAt)
                plan.participants.forEach { participant ->
                    requireReference(people, participant.personId, "recurring share plan participant")
                    participant.fixedAmount?.let(::BigDecimal)
                }
            }
            section.plannedShares.forEach { share ->
                uniqueIds(share.participants.map { it.id }, "planned share participant")
                requireContext(context.validationContext.containsExpectedMovement(share.expectedMovementId), "planned share expected movement", share.expectedMovementId)
                share.sourcePlanId?.let { id -> requireReference(section.recurringPlans.map { it.id }.toSet(), id, "planned share plan") }
                requireReference(people, share.payerPersonId, "planned share payer")
                RecurringShareAllocationMode.from(share.mode)
                PlannedExpenseShareStatus.valueOf(share.status.uppercase())
                BigDecimal(share.totalAmount)
                Instant.parse(share.createdAt)
                Instant.parse(share.updatedAt)
                share.participants.forEach { participant ->
                    requireReference(people, participant.personId, "planned share participant")
                    BigDecimal(participant.amount)
                }
                share.materializedTransactionId?.let { requireContext(context.validationContext.containsMovement(it), "planned share materialized transaction", it) }
                share.materializedShareId?.let { id -> requireReference(section.expenseShares.map { it.id }.toSet(), id, "planned share materialized share") }
            }
            BackupValidationResult.Valid
        } catch (error: IllegalArgumentException) {
            val message = error.message ?: "Invalid sharing data"
            BackupValidationResult.Invalid(if (error is BackupReferenceValidationException) BackupErrorCode.INVALID_REFERENCE else BackupErrorCode.INVALID_DATA, message)
        }
    }

    override fun import(section: BackupSection, context: BackupImportContext) {
        val sharing = section as? SharingBackupSection ?: throw BackupImportException(BackupErrorCode.INVALID_DATA, "Expected sharing backup section")
        sharing.persons.forEach { personRepository.save(SharingPerson(SharingPersonId.from(it.id), it.displayName, it.normalizedName, Instant.parse(it.createdAt), it.archivedAt?.let(Instant::parse))) }
        sharing.expenseShares.forEach { share ->
            expenseShareRepository.save(ExpenseShare(ExpenseShareId.from(share.id), share.sourceTransactionId, SharingPersonId.from(share.payerPersonId), BigDecimal(share.totalAmount), share.currency, share.participants.map { ShareParticipant(ShareParticipantId.from(it.id), SharingPersonId.from(it.personId), BigDecimal(it.amount), it.reimbursable, it.expectedMovementId) }, Instant.parse(share.createdAt), Instant.parse(share.updatedAt)))
        }
        sharing.recurringPlans.forEach { plan ->
            recurringPlanRepository.save(RecurringSharePlan(RecurringSharePlanId(UUID.fromString(plan.id)), RecurringMovementRef(plan.recurringMovementId), SharingPersonId.from(plan.payerPersonId), RecurringShareAllocationMode.from(plan.mode), plan.currency, plan.payerParts, plan.participants.map { RecurringShareParticipantTemplate(RecurringShareParticipantTemplateId(UUID.fromString(it.id)), SharingPersonId.from(it.personId), it.parts, it.fixedAmount?.let(::BigDecimal), it.reimbursable, it.order) }, Instant.parse(plan.createdAt), Instant.parse(plan.updatedAt)))
        }
        sharing.plannedShares.forEach { share ->
            plannedShareRepository.save(
                PlannedExpenseShare(
                    PlannedExpenseShareId(UUID.fromString(share.id)), ExpectedMovementRef(share.expectedMovementId),
                    share.sourcePlanId?.let {
                        RecurringSharePlanId(UUID.fromString(it))
                    },
                    SharingPersonId.from(share.payerPersonId), RecurringShareAllocationMode.from(share.mode), share.payerParts, BigDecimal(share.totalAmount), share.currency, share.participants.map { PlannedExpenseShareParticipant(PlannedExpenseShareParticipantId(UUID.fromString(it.id)), SharingPersonId.from(it.personId), it.parts, BigDecimal(it.amount), it.reimbursable, it.order) }, PlannedExpenseShareStatus.valueOf(share.status.uppercase()), share.materializedTransactionId, share.materializedShareId?.let(ExpenseShareId::from), Instant.parse(share.createdAt), Instant.parse(share.updatedAt),
                ),
            )
        }
    }
}

data class BackupAnalyticsExclusion(val id: String, val scopeType: String, val scopeId: String, val reason: String, val createdAt: String)
data class AnalyticsBackupSection(val exclusions: List<BackupAnalyticsExclusion>) : BackupSection {
    override val sectionId = BackupSectionId.ANALYTICS
    override val version = 1
    override fun references() = exclusions.map { BackupReference.AnalyticsExclusion(it.id) }
}

class AnalyticsBackupSectionExporter(private val repository: AnalyticsExclusionRepository) : BackupSectionExporter {
    override val sectionId = BackupSectionId.ANALYTICS
    override val version = 1
    override fun export() = AnalyticsBackupSection(repository.listAll().map { BackupAnalyticsExclusion(it.id.toString(), it.scopeType.value, it.scopeId, it.reason.value, it.createdAt.toString()) }.sortedBy { it.id })
}

class AnalyticsBackupSectionImporter(private val repository: AnalyticsExclusionRepository) : BackupSectionImporter {
    override val sectionId = BackupSectionId.ANALYTICS
    override val supportedVersions = setOf(1)
    override val dependencies = setOf(BackupSectionId.LEDGER, BackupSectionId.EXPECTED, BackupSectionId.SHARING)
    override fun validate(section: BackupSection, context: BackupImportContext): BackupValidationResult = try {
        if (section !is AnalyticsBackupSection) return BackupValidationResult.Invalid(BackupErrorCode.INVALID_DATA, "Expected analytics backup section")
        uniqueIds(section.exclusions.map { it.id }, "analytics exclusion")
        section.exclusions.forEach {
            when (AnalyticsExclusionScopeType.from(it.scopeType)) {
                AnalyticsExclusionScopeType.MOVEMENT -> requireContext(context.validationContext.containsMovement(it.scopeId), "analytics movement", it.scopeId)
                AnalyticsExclusionScopeType.SPLIT_ITEM -> requireContext(context.validationContext.containsSplitItem(it.scopeId), "analytics split item", it.scopeId)
                AnalyticsExclusionScopeType.SHARE_PARTICIPANT -> requireContext(context.validationContext.containsShareParticipant(it.scopeId), "analytics share participant", it.scopeId)
                AnalyticsExclusionScopeType.EXPECTED_MOVEMENT -> requireContext(context.validationContext.containsExpectedMovement(it.scopeId), "analytics expected movement", it.scopeId)
            }
            AnalyticsExclusionReason.from(it.reason)
            Instant.parse(it.createdAt)
        }
        BackupValidationResult.Valid
    } catch (error: IllegalArgumentException) {
        BackupValidationResult.Invalid(if (error is BackupReferenceValidationException) BackupErrorCode.INVALID_REFERENCE else BackupErrorCode.INVALID_DATA, error.message ?: "Invalid analytics backup section")
    }
    override fun import(section: BackupSection, context: BackupImportContext) {
        (section as AnalyticsBackupSection).exclusions.forEach { repository.save(AnalyticsExclusion(UUID.fromString(it.id), AnalyticsExclusionScopeType.from(it.scopeType), it.scopeId, AnalyticsExclusionReason.from(it.reason), Instant.parse(it.createdAt))) }
    }
}

data class PreferencesBackupSection(val defaultAccountId: String?) : BackupSection {
    override val sectionId = BackupSectionId.PREFERENCES
    override val version = 1
}

class PreferencesBackupSectionExporter(private val repository: UserPreferencesRepository, private val ownerId: PreferencesOwnerId) : BackupSectionExporter {
    override val sectionId = BackupSectionId.PREFERENCES
    override val version = 1
    override fun export() = PreferencesBackupSection(repository.findByOwnerId(ownerId)?.defaultAccountId?.value)
}

class PreferencesBackupSectionImporter(private val repository: UserPreferencesRepository, private val ownerId: PreferencesOwnerId) : BackupSectionImporter {
    override val sectionId = BackupSectionId.PREFERENCES
    override val supportedVersions = setOf(1)
    override val dependencies = setOf(BackupSectionId.LEDGER)
    override fun validate(section: BackupSection, context: BackupImportContext): BackupValidationResult = try {
        val preferences = section as? PreferencesBackupSection ?: return BackupValidationResult.Invalid(BackupErrorCode.INVALID_DATA, "Expected preferences backup section")
        preferences.defaultAccountId?.let { id -> requireContext(context.validationContext.containsAccount(id), "default account", id) }
        BackupValidationResult.Valid
    } catch (error: IllegalArgumentException) {
        BackupValidationResult.Invalid(if (error is BackupReferenceValidationException) BackupErrorCode.INVALID_REFERENCE else BackupErrorCode.INVALID_DATA, error.message ?: "Invalid preferences reference")
    }
    override fun import(section: BackupSection, context: BackupImportContext) {
        repository.save(com.gonezo.preferences.domain.UserPreferences(ownerId, (section as PreferencesBackupSection).defaultAccountId?.let(DefaultAccountId::from)))
    }
}

private fun uniqueIds(ids: List<String>, label: String): Set<String> = ids.toSet().also { if (it.size != ids.size || ids.any(String::isBlank)) throw IllegalArgumentException("Duplicate or blank $label id") }
private fun requireReference(ids: Set<String>, id: String, label: String) {
    if (id !in ids) throw BackupReferenceValidationException("Invalid $label reference: $id")
}
private fun requireContext(found: Boolean, label: String, id: String) {
    if (!found) throw BackupReferenceValidationException("Invalid $label reference: $id")
}
