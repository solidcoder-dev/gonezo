package com.gonezo.application.orchestration.backup

import java.time.Instant

enum class BackupSectionId {
    TAXONOMY,
    LEDGER,
    RECURRENCE,
    EXPECTED,
    SHARING,
    ANALYTICS,
    PREFERENCES,
}

interface BackupSection {
    val sectionId: BackupSectionId
    val version: Int

    fun references(): Set<BackupReference> = emptySet()
}

sealed interface BackupReference {
    val id: String

    data class Account(override val id: String) : BackupReference
    data class Category(override val id: String) : BackupReference
    data class Tag(override val id: String) : BackupReference
    data class Movement(override val id: String) : BackupReference
    data class SplitItem(override val id: String) : BackupReference
    data class ShareParticipant(override val id: String) : BackupReference
    data class RecurringMovement(override val id: String) : BackupReference
    data class RecurringOccurrence(override val id: String) : BackupReference
    data class ExpectedMovement(override val id: String) : BackupReference
    data class SharingPerson(override val id: String) : BackupReference
    data class ExpenseShare(override val id: String) : BackupReference
    data class RecurringSharePlan(override val id: String) : BackupReference
    data class PlannedExpenseShare(override val id: String) : BackupReference
}

class BackupValidationContext private constructor(
    private val references: Set<BackupReference>,
) {
    fun contains(reference: BackupReference): Boolean = reference in references

    fun containsAccount(id: String): Boolean = contains(BackupReference.Account(id))
    fun containsCategory(id: String): Boolean = contains(BackupReference.Category(id))
    fun containsTag(id: String): Boolean = contains(BackupReference.Tag(id))
    fun containsMovement(id: String): Boolean = contains(BackupReference.Movement(id))
    fun containsSplitItem(id: String): Boolean = contains(BackupReference.SplitItem(id))
    fun containsShareParticipant(id: String): Boolean = contains(BackupReference.ShareParticipant(id))
    fun containsRecurringMovement(id: String): Boolean = contains(BackupReference.RecurringMovement(id))
    fun containsRecurringOccurrence(id: String): Boolean = contains(BackupReference.RecurringOccurrence(id))
    fun containsExpectedMovement(id: String): Boolean = contains(BackupReference.ExpectedMovement(id))
    fun containsSharingPerson(id: String): Boolean = contains(BackupReference.SharingPerson(id))
    fun containsExpenseShare(id: String): Boolean = contains(BackupReference.ExpenseShare(id))
    fun containsRecurringSharePlan(id: String): Boolean = contains(BackupReference.RecurringSharePlan(id))
    fun containsPlannedExpenseShare(id: String): Boolean = contains(BackupReference.PlannedExpenseShare(id))

    companion object {
        fun from(sections: Map<BackupSectionId, BackupSection>): BackupValidationContext =
            BackupValidationContext(sections.values.flatMap { it.references() }.toSet())
    }
}

interface BackupSectionExporter {
    val sectionId: BackupSectionId
    val version: Int

    fun export(): BackupSection
}

interface BackupSectionImporter {
    val sectionId: BackupSectionId
    val supportedVersions: Set<Int>
    val dependencies: Set<BackupSectionId>

    fun validate(section: BackupSection, context: BackupImportContext): BackupValidationResult

    fun import(section: BackupSection, context: BackupImportContext)
}

fun interface PortableStateReset {
    fun reset()
}

data class BackupImportContext(
    val importedAt: Instant,
    val sections: Map<BackupSectionId, BackupSection>,
    val validationContext: BackupValidationContext = BackupValidationContext.from(sections),
)

sealed interface BackupValidationResult {
    data object Valid : BackupValidationResult

    data class Invalid(val code: BackupErrorCode, val message: String) : BackupValidationResult
}

enum class BackupErrorCode {
    INVALID_FORMAT,
    UNSUPPORTED_FORMAT_VERSION,
    UNSUPPORTED_SECTION_VERSION,
    MISSING_SECTION,
    INVALID_REFERENCE,
    INVALID_DATA,
    DEPENDENCY_ERROR,
    IMPORT_FAILED,
    EXPORT_FAILED,
    IO_FAILED,
}

data class ApplicationBackupDocument(
    val format: String,
    val formatVersion: Int,
    val createdAt: Instant,
    val sections: Map<BackupSectionId, BackupSection>,
)

class BackupDependencyException(message: String) : IllegalArgumentException(message)

class BackupReferenceValidationException(message: String) : IllegalArgumentException(message)

object BackupSectionDependencyResolver {
    fun resolve(importers: Collection<BackupSectionImporter>): List<BackupSectionImporter> {
        val byId = importers.associateBy { it.sectionId }
        if (byId.size != importers.size) throw BackupDependencyException("Duplicate backup section importer")
        val visiting = mutableSetOf<BackupSectionId>()
        val visited = mutableSetOf<BackupSectionId>()
        val ordered = mutableListOf<BackupSectionImporter>()

        fun visit(sectionId: BackupSectionId) {
            if (sectionId in visited) return
            if (!visiting.add(sectionId)) throw BackupDependencyException("Backup section dependency cycle at $sectionId")
            val importer = byId[sectionId] ?: throw BackupDependencyException("Missing importer for dependency $sectionId")
            importer.dependencies.sortedBy(BackupSectionId::name).forEach(::visit)
            visiting.remove(sectionId)
            visited.add(sectionId)
            ordered += importer
        }

        byId.keys.sortedBy(BackupSectionId::name).forEach(::visit)
        return ordered
    }
}
